"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getCurrentProfile, INTERNAL_ROLES } from "@/lib/auth/get-current-profile"

interface ActionResult {
  success: boolean
  error?: string
}

async function requireInternalRole() {
  const profile = await getCurrentProfile()
  if (!profile || profile.accountStatus !== "active" || !INTERNAL_ROLES.includes(profile.role)) {
    return null
  }
  return profile
}

export async function proposeCandidate(requestId: string, candidateId: string): Promise<ActionResult> {
  const actor = await requireInternalRole()
  if (!actor) {
    return { success: false, error: "Keine Berechtigung." }
  }

  const idsSchema = z.object({ requestId: z.string().uuid(), candidateId: z.string().uuid() })
  const parsed = idsSchema.safeParse({ requestId, candidateId })
  if (!parsed.success) {
    return { success: false, error: "Ungültige Anfrage oder Kandidat." }
  }

  const supabase = await createClient()

  const { data: request } = await supabase
    .from("personnel_requests")
    .select("id, status")
    .eq("id", requestId)
    .single()

  if (!request) {
    return { success: false, error: "Anfrage nicht gefunden." }
  }
  if (request.status !== "reviewed") {
    return { success: false, error: "Die Anfrage muss zuerst geprüft werden, bevor Kandidaten vorgeschlagen werden können." }
  }

  const { data: candidate } = await supabase
    .from("candidates")
    .select("id, profile_id")
    .eq("id", candidateId)
    .single()

  if (!candidate) {
    return { success: false, error: "Kandidat nicht gefunden." }
  }

  if (candidate.profile_id) {
    const { data: candidateProfile } = await supabase
      .from("profiles")
      .select("account_status")
      .eq("id", candidate.profile_id)
      .single()

    if (candidateProfile?.account_status !== "active") {
      return { success: false, error: "Dieser Kandidat hat kein aktives Konto und kann nicht vorgeschlagen werden." }
    }
  }

  const { data: existing } = await supabase
    .from("candidate_proposals")
    .select("id")
    .eq("request_id", requestId)
    .eq("candidate_id", candidateId)
    .eq("status", "proposed")
    .limit(1)

  if (existing && existing.length > 0) {
    return { success: false, error: "Dieser Kandidat wurde für diese Anfrage bereits vorgeschlagen und wartet noch auf Entscheidung." }
  }

  const { data: inserted, error } = await supabase
    .from("candidate_proposals")
    .insert({
      request_id: requestId,
      candidate_id: candidateId,
      proposed_by_id: actor.id,
      status: "proposed",
      created_by_id: actor.id,
      created_by: actor.fullName ?? actor.email,
    })
    .select("id")

  if (error || !inserted || inserted.length === 0) {
    return { success: false, error: "Vorschlag konnte nicht angelegt werden." }
  }

  await supabase.from("activity_log").insert({
    actor_id: actor.id,
    entity_type: "candidate_proposal",
    entity_id: inserted[0].id,
    action: "proposed",
  })

  revalidatePath(`/internal/requests/${requestId}/candidates`)
  revalidatePath(`/internal/requests/${requestId}/proposals`)
  revalidatePath(`/internal/requests/${requestId}`)
  return { success: true }
}

export async function reviewProposal(
  proposalId: string,
  decision: "approved" | "rejected",
): Promise<ActionResult> {
  const actor = await requireInternalRole()
  if (!actor) {
    return { success: false, error: "Keine Berechtigung." }
  }

  const schema = z.object({
    proposalId: z.string().uuid(),
    decision: z.enum(["approved", "rejected"]),
  })
  const parsed = schema.safeParse({ proposalId, decision })
  if (!parsed.success) {
    return { success: false, error: "Ungültige Eingabe." }
  }

  const supabase = await createClient()

  const { data: proposal } = await supabase
    .from("candidate_proposals")
    .select("id, status, request_id, proposed_by_id")
    .eq("id", proposalId)
    .single()

  if (!proposal) {
    return { success: false, error: "Vorschlag nicht gefunden." }
  }
  if (proposal.status !== "proposed") {
    return { success: false, error: "Über diesen Vorschlag wurde bereits entschieden." }
  }

  const { data: updated, error } = await supabase
    .from("candidate_proposals")
    .update({ status: decision })
    .eq("id", proposalId)
    .select("id")

  if (error || !updated || updated.length === 0) {
    return { success: false, error: "Entscheidung konnte nicht gespeichert werden." }
  }

  await supabase.from("activity_log").insert({
    actor_id: actor.id,
    entity_type: "candidate_proposal",
    entity_id: proposalId,
    action: decision,
  })

  const { data: request } = await supabase
    .from("personnel_requests")
    .select("title, created_by_id")
    .eq("id", proposal.request_id)
    .single()

  if (decision === "approved" && request?.created_by_id) {
    await supabase.from("notifications").insert({
      recipient_id: request.created_by_id,
      type: "proposal_approved",
      message: `Ein neuer Kandidatenvorschlag für „${request.title}" ist verfügbar.`,
    })
  }

  // PROJ-13: a partner-sourced proposal's own proposer (unlike an internal
  // one) has no other way to learn about the internal decision — they
  // don't see the request/proposals list at all, only their own proposal.
  if (proposal.proposed_by_id) {
    const { data: proposerProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", proposal.proposed_by_id)
      .maybeSingle()

    if (proposerProfile?.role === "partner_company") {
      await supabase.from("notifications").insert({
        recipient_id: proposal.proposed_by_id,
        type: "proposal_decision",
        message:
          decision === "approved"
            ? `Ihr Vorschlag für „${request?.title ?? "eine Anfrage"}" wurde intern freigegeben.`
            : `Ihr Vorschlag für „${request?.title ?? "eine Anfrage"}" wurde abgelehnt.`,
      })
    }
  }

  revalidatePath(`/internal/requests/${proposal.request_id}/proposals`)
  revalidatePath(`/internal/requests/${proposal.request_id}`)
  revalidatePath("/partner/requests")
  return { success: true }
}

export async function withdrawProposal(proposalId: string): Promise<ActionResult> {
  const actor = await requireInternalRole()
  if (!actor) {
    return { success: false, error: "Keine Berechtigung." }
  }

  if (!z.string().uuid().safeParse(proposalId).success) {
    return { success: false, error: "Ungültiger Vorschlag." }
  }

  const supabase = await createClient()

  const { data: proposal } = await supabase
    .from("candidate_proposals")
    .select("id, status, request_id")
    .eq("id", proposalId)
    .single()

  if (!proposal) {
    return { success: false, error: "Vorschlag nicht gefunden." }
  }
  if (proposal.status !== "proposed") {
    return { success: false, error: "Nur noch offene Vorschläge können zurückgezogen werden." }
  }

  const { data: deleted, error } = await supabase
    .from("candidate_proposals")
    .delete()
    .eq("id", proposalId)
    .select("id")

  if (error || !deleted || deleted.length === 0) {
    return { success: false, error: "Vorschlag konnte nicht zurückgezogen werden." }
  }

  revalidatePath(`/internal/requests/${proposal.request_id}/proposals`)
  revalidatePath(`/internal/requests/${proposal.request_id}`)
  return { success: true }
}
