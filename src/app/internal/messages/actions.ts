"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getCurrentProfile, INTERNAL_ROLES } from "@/lib/auth/get-current-profile"
import { sendMessageSchema, type SendMessageInput } from "@/lib/messages/schema"

interface ActionResult {
  success: boolean
  error?: string
}

export type InternalMessageTarget =
  | { messageType: "request"; requestId: string }
  | { messageType: "assignment"; assignmentId: string }
  | { messageType: "general_candidate"; candidateId: string }
  | { messageType: "general_municipality"; municipalityId: string }

async function requireInternalRole() {
  const profile = await getCurrentProfile()
  if (!profile || profile.accountStatus !== "active" || !INTERNAL_ROLES.includes(profile.role)) {
    return null
  }
  return profile
}

export async function sendInternalMessage(
  target: InternalMessageTarget,
  input: SendMessageInput
): Promise<ActionResult> {
  const actor = await requireInternalRole()
  if (!actor) {
    return { success: false, error: "Keine Berechtigung." }
  }

  const parsed = sendMessageSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." }
  }

  const supabase = await createClient()

  const insertPayload: Record<string, unknown> = {
    message_type: target.messageType,
    content: parsed.data.content,
    subject: parsed.data.subject ?? null,
    created_by_id: actor.id,
    created_by: actor.fullName ?? actor.email,
  }
  if (target.messageType === "request") insertPayload.request_id = target.requestId
  if (target.messageType === "assignment") insertPayload.assignment_id = target.assignmentId
  if (target.messageType === "general_candidate") insertPayload.candidate_id = target.candidateId
  if (target.messageType === "general_municipality") {
    insertPayload.municipality_id = target.municipalityId
  }

  const { error } = await supabase.from("messages").insert(insertPayload)
  if (error) {
    return { success: false, error: "Nachricht konnte nicht gesendet werden." }
  }

  await notifyCounterpart(target)

  return { success: true }
}

async function notifyCounterpart(target: InternalMessageTarget): Promise<void> {
  const supabase = await createClient()

  if (target.messageType === "request") {
    const { data: request } = await supabase
      .from("personnel_requests")
      .select("created_by_id, title")
      .eq("id", target.requestId)
      .single()
    if (request?.created_by_id) {
      await supabase.from("notifications").insert({
        recipient_id: request.created_by_id,
        type: "new_message",
        message: `Neue Nachricht zu Ihrer Anfrage „${request.title}".`,
      })
    }
    revalidatePath(`/internal/requests/${target.requestId}`)
    revalidatePath(`/municipality/requests/${target.requestId}`)
    return
  }

  if (target.messageType === "assignment") {
    const { data: assignment } = await supabase
      .from("assignments")
      .select("proposal:candidate_proposals(candidate:candidates(profile_id))")
      .eq("id", target.assignmentId)
      .single()
    const proposal = assignment
      ? Array.isArray(assignment.proposal)
        ? assignment.proposal[0]
        : assignment.proposal
      : null
    const candidate = proposal
      ? Array.isArray(proposal.candidate)
        ? proposal.candidate[0]
        : proposal.candidate
      : null
    if (candidate?.profile_id) {
      await supabase.from("notifications").insert({
        recipient_id: candidate.profile_id,
        type: "new_message",
        message: "Neue Nachricht zu Ihrem Einsatz.",
      })
    }
    revalidatePath(`/internal/assignments/${target.assignmentId}`)
    revalidatePath(`/candidate/assignments/${target.assignmentId}`)
    return
  }

  if (target.messageType === "general_candidate") {
    const { data: candidate } = await supabase
      .from("candidates")
      .select("profile_id")
      .eq("id", target.candidateId)
      .single()
    if (candidate?.profile_id) {
      await supabase.from("notifications").insert({
        recipient_id: candidate.profile_id,
        type: "new_message",
        message: "Neue Nachricht von Dafinex.",
      })
    }
    revalidatePath(`/internal/candidates/${target.candidateId}`)
    revalidatePath("/candidate/dashboard")
    return
  }

  const { data: municipalityProfiles } = await supabase
    .from("profiles")
    .select("id")
    .eq("municipality_id", target.municipalityId)
    .eq("role", "municipality")
    .eq("account_status", "active")
  if (municipalityProfiles && municipalityProfiles.length > 0) {
    await supabase.from("notifications").insert(
      municipalityProfiles.map((p) => ({
        recipient_id: p.id,
        type: "new_message",
        message: "Neue Nachricht von Dafinex.",
      }))
    )
  }
  revalidatePath(`/internal/municipalities/${target.municipalityId}`)
  revalidatePath("/municipality/dashboard")
}
