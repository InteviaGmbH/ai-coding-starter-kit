"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getCurrentProfile } from "@/lib/auth/get-current-profile"

interface ActionResult {
  success: boolean
  error?: string
}

async function requireActiveMunicipality() {
  const profile = await getCurrentProfile()
  if (
    !profile ||
    profile.role !== "municipality" ||
    profile.accountStatus !== "active" ||
    !profile.municipalityId
  ) {
    return null
  }
  return profile
}

async function decide(proposalId: string, decision: "municipality_accepted" | "municipality_declined"): Promise<ActionResult> {
  const actor = await requireActiveMunicipality()
  if (!actor) {
    return { success: false, error: "Keine Berechtigung." }
  }

  if (!z.string().uuid().safeParse(proposalId).success) {
    return { success: false, error: "Ungültiger Vorschlag." }
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

  const { data: request } = await supabase
    .from("personnel_requests")
    .select("id, title, municipality_id")
    .eq("id", proposal.request_id)
    .single()

  if (!request || request.municipality_id !== actor.municipalityId) {
    return { success: false, error: "Vorschlag nicht gefunden." }
  }
  if (proposal.status !== "approved") {
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

  if (proposal.proposed_by_id) {
    const decisionLabel = decision === "municipality_accepted" ? "angenommen" : "abgelehnt"
    await supabase.from("notifications").insert({
      recipient_id: proposal.proposed_by_id,
      type: "proposal_decision",
      message: `Die Gemeinde hat den Vorschlag für „${request.title}" ${decisionLabel}.`,
    })
  }

  revalidatePath(`/municipality/requests/${proposal.request_id}/proposals`)
  revalidatePath(`/municipality/requests/${proposal.request_id}`)
  revalidatePath(`/internal/requests/${proposal.request_id}/proposals`)
  return { success: true }
}

export async function acceptProposal(proposalId: string): Promise<ActionResult> {
  return decide(proposalId, "municipality_accepted")
}

export async function declineProposal(proposalId: string): Promise<ActionResult> {
  return decide(proposalId, "municipality_declined")
}
