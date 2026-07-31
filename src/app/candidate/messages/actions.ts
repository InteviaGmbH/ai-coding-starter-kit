"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getCurrentProfile } from "@/lib/auth/get-current-profile"
import { sendMessageSchema, type SendMessageInput } from "@/lib/messages/schema"
import { broadcastNewMessageToInternal } from "@/lib/notifications/broadcast-new-message"

interface ActionResult {
  success: boolean
  error?: string
}

async function requireOwnCandidateId() {
  const profile = await getCurrentProfile()
  if (
    !profile ||
    profile.accountStatus !== "active" ||
    profile.role !== "candidate" ||
    !profile.candidateId
  ) {
    return null
  }
  return profile
}

export async function sendCandidateAssignmentMessage(
  assignmentId: string,
  input: SendMessageInput
): Promise<ActionResult> {
  const actor = await requireOwnCandidateId()
  if (!actor) {
    return { success: false, error: "Keine Berechtigung." }
  }
  if (!z.string().uuid().safeParse(assignmentId).success) {
    return { success: false, error: "Ungültige Anfrage." }
  }

  const parsed = sendMessageSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." }
  }

  const supabase = await createClient()

  // Defense in depth beyond RLS: confirm this assignment really belongs to the caller's own candidate.
  const { data: assignment } = await supabase
    .from("assignments")
    .select("id, proposal:candidate_proposals(candidate_id)")
    .eq("id", assignmentId)
    .maybeSingle()

  const proposal = assignment
    ? Array.isArray(assignment.proposal)
      ? assignment.proposal[0]
      : assignment.proposal
    : null

  if (!assignment || proposal?.candidate_id !== actor.candidateId) {
    return { success: false, error: "Einsatz nicht gefunden." }
  }

  const { error } = await supabase.from("messages").insert({
    message_type: "assignment",
    assignment_id: assignmentId,
    content: parsed.data.content,
    subject: parsed.data.subject ?? null,
    created_by_id: actor.id,
    created_by: actor.fullName ?? actor.email,
  })

  if (error) {
    return { success: false, error: "Nachricht konnte nicht gesendet werden." }
  }

  await broadcastNewMessageToInternal("Neue Nachricht zu einem Einsatz.")

  revalidatePath(`/candidate/assignments/${assignmentId}`)
  revalidatePath(`/internal/assignments/${assignmentId}`)
  return { success: true }
}

export async function sendCandidateGeneralMessage(input: SendMessageInput): Promise<ActionResult> {
  const actor = await requireOwnCandidateId()
  if (!actor) {
    return { success: false, error: "Keine Berechtigung." }
  }

  const parsed = sendMessageSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." }
  }

  const supabase = await createClient()

  const { error } = await supabase.from("messages").insert({
    message_type: "general_candidate",
    candidate_id: actor.candidateId,
    content: parsed.data.content,
    subject: parsed.data.subject ?? null,
    created_by_id: actor.id,
    created_by: actor.fullName ?? actor.email,
  })

  if (error) {
    return { success: false, error: "Nachricht konnte nicht gesendet werden." }
  }

  await broadcastNewMessageToInternal("Neue allgemeine Nachricht von einem Kandidaten.")

  revalidatePath("/candidate/dashboard")
  revalidatePath(`/internal/candidates/${actor.candidateId}`)
  return { success: true }
}
