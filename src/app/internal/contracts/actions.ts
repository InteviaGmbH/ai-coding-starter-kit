"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getCurrentProfile, INTERNAL_ROLES } from "@/lib/auth/get-current-profile"

interface ActionResult {
  success: boolean
  error?: string
  id?: string
}

const ASSIGNMENT_STATUSES_ALLOWING_CONTRACT = ["accepted", "active", "completed"]

async function requireInternalRole() {
  const profile = await getCurrentProfile()
  if (!profile || profile.accountStatus !== "active" || !INTERNAL_ROLES.includes(profile.role)) {
    return null
  }
  return profile
}

export async function createContract(
  assignmentId: string,
  generatedDocumentPath: string,
): Promise<ActionResult> {
  const actor = await requireInternalRole()
  if (!actor) {
    return { success: false, error: "Keine Berechtigung." }
  }

  const schema = z.object({
    assignmentId: z.string().uuid(),
    generatedDocumentPath: z.string().trim().min(1),
  })
  const parsed = schema.safeParse({ assignmentId, generatedDocumentPath })
  if (!parsed.success) {
    return { success: false, error: "Ungültige Eingabe." }
  }

  const supabase = await createClient()

  const { data: assignment } = await supabase
    .from("assignments")
    .select("id, status, proposal:candidate_proposals(request:personnel_requests(created_by_id, title))")
    .eq("id", assignmentId)
    .single()

  if (!assignment) {
    return { success: false, error: "Einsatz nicht gefunden." }
  }
  if (!ASSIGNMENT_STATUSES_ALLOWING_CONTRACT.includes(assignment.status)) {
    return {
      success: false,
      error: 'Der Einsatz muss mindestens den Status „akzeptiert" haben, bevor ein Vertrag angelegt werden kann.',
    }
  }

  const { data: existing } = await supabase
    .from("contracts")
    .select("id")
    .eq("assignment_id", assignmentId)
    .limit(1)

  if (existing && existing.length > 0) {
    return { success: false, error: "Für diesen Einsatz existiert bereits ein Vertrag." }
  }

  const { data: inserted, error } = await supabase
    .from("contracts")
    .insert({
      assignment_id: assignmentId,
      generated_document_path: parsed.data.generatedDocumentPath,
      status: "generated",
      created_by_id: actor.id,
      created_by: actor.fullName ?? actor.email,
    })
    .select("id")

  if (error || !inserted || inserted.length === 0) {
    return { success: false, error: "Vertrag konnte nicht angelegt werden." }
  }

  await supabase.from("activity_log").insert({
    actor_id: actor.id,
    entity_type: "contract",
    entity_id: inserted[0].id,
    action: "generated",
  })

  const proposal = Array.isArray(assignment.proposal) ? assignment.proposal[0] : assignment.proposal
  const request = proposal ? (Array.isArray(proposal.request) ? proposal.request[0] : proposal.request) : null
  if (request?.created_by_id) {
    await supabase.from("notifications").insert({
      recipient_id: request.created_by_id,
      type: "contract_ready",
      message: `Der Vertrag für „${request.title}" ist bereit.`,
    })
  }

  revalidatePath(`/internal/assignments/${assignmentId}`)
  revalidatePath(`/municipality/assignments/${assignmentId}`)
  return { success: true, id: inserted[0].id }
}

export async function setSignedDocument(
  contractId: string,
  signedDocumentPath: string,
): Promise<ActionResult> {
  const actor = await requireInternalRole()
  if (!actor) {
    return { success: false, error: "Keine Berechtigung." }
  }

  const schema = z.object({
    contractId: z.string().uuid(),
    signedDocumentPath: z.string().trim().min(1),
  })
  const parsed = schema.safeParse({ contractId, signedDocumentPath })
  if (!parsed.success) {
    return { success: false, error: "Ungültige Eingabe." }
  }

  const supabase = await createClient()

  const { data: contract } = await supabase
    .from("contracts")
    .select("id, status, assignment_id")
    .eq("id", contractId)
    .single()

  if (!contract) {
    return { success: false, error: "Vertrag nicht gefunden." }
  }
  if (contract.status !== "generated") {
    return { success: false, error: "Für diesen Vertrag wurde bereits eine unterschriebene Version hinterlegt." }
  }

  const { data: updated, error } = await supabase
    .from("contracts")
    .update({ signed_document_path: parsed.data.signedDocumentPath, status: "signed" })
    .eq("id", contractId)
    .select("id")

  if (error || !updated || updated.length === 0) {
    return { success: false, error: "Unterschriebene Version konnte nicht gespeichert werden." }
  }

  await supabase.from("activity_log").insert({
    actor_id: actor.id,
    entity_type: "contract",
    entity_id: contractId,
    action: "signed",
  })

  revalidatePath(`/internal/assignments/${contract.assignment_id}`)
  revalidatePath(`/municipality/assignments/${contract.assignment_id}`)
  return { success: true }
}
