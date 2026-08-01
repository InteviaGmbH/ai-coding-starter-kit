"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getCurrentProfile, INTERNAL_ROLES } from "@/lib/auth/get-current-profile"
import { loadContractSigningContext } from "@/lib/contracts/load-signing-context"
import { signContractDigitally, finalizeSignature } from "@/lib/contracts/sign-digital"
import { signDigitalSchema, type SignDigitalInput } from "@/lib/contracts/schema"

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

// PROJ-15: replaces the old single-file "setSignedDocument" (whole-contract
// upload straight to status='signed') with two independent signing paths —
// Dafinex's own digital signature, and a file-upload fallback for a
// candidate without a portal account. contracts.status is never set
// directly anymore; the contract_signatures_fully_signed trigger flips it
// once all three parties have signed.

export async function signContractAsDafinex(
  contractId: string,
  input: SignDigitalInput
): Promise<ActionResult> {
  const actor = await requireInternalRole()
  if (!actor) {
    return { success: false, error: "Keine Berechtigung." }
  }
  if (!z.string().uuid().safeParse(contractId).success) {
    return { success: false, error: "Ungültige Anfrage." }
  }

  const parsed = signDigitalSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." }
  }

  const ctx = await loadContractSigningContext(contractId)
  if (!ctx) {
    return { success: false, error: "Vertrag nicht gefunden." }
  }

  return signContractDigitally(
    ctx,
    "dafinex",
    actor.id,
    actor.fullName ?? actor.email,
    parsed.data.signerName
  )
}

export async function uploadCandidateSignatureFallback(
  contractId: string,
  filePath: string
): Promise<ActionResult> {
  const actor = await requireInternalRole()
  if (!actor) {
    return { success: false, error: "Keine Berechtigung." }
  }

  const schema = z.object({ contractId: z.string().uuid(), filePath: z.string().trim().min(1) })
  const parsed = schema.safeParse({ contractId, filePath })
  if (!parsed.success) {
    return { success: false, error: "Ungültige Eingabe." }
  }

  const ctx = await loadContractSigningContext(contractId)
  if (!ctx) {
    return { success: false, error: "Vertrag nicht gefunden." }
  }

  const supabase = await createClient()
  const { error } = await supabase.from("contract_signatures").insert({
    contract_id: contractId,
    party_type: "candidate",
    method: "upload",
    file_path: parsed.data.filePath,
    created_by_id: actor.id,
    created_by: actor.fullName ?? actor.email,
  })

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Für diesen Kandidaten wurde bereits eine Unterschrift hinterlegt." }
    }
    return { success: false, error: "Datei konnte nicht gespeichert werden." }
  }

  await supabase.from("activity_log").insert({
    actor_id: actor.id,
    entity_type: "contract_signature",
    entity_id: contractId,
    action: "signed_candidate",
  })

  await finalizeSignature(ctx, "candidate")

  return { success: true }
}
