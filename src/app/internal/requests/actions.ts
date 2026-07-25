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

export async function markRequestReviewed(id: string): Promise<ActionResult> {
  const actor = await requireInternalRole()
  if (!actor) {
    return { success: false, error: "Keine Berechtigung." }
  }

  if (!z.string().uuid().safeParse(id).success) {
    return { success: false, error: "Ungültige Anfrage." }
  }

  const supabase = await createClient()

  const { data: request } = await supabase
    .from("personnel_requests")
    .select("id, status, title, created_by_id")
    .eq("id", id)
    .single()

  if (!request) {
    return { success: false, error: "Anfrage nicht gefunden." }
  }

  // Idempotent: already reviewed → no-op, no duplicate activity/notification.
  if (request.status === "reviewed") {
    return { success: true }
  }

  const { error } = await supabase
    .from("personnel_requests")
    .update({ status: "reviewed" })
    .eq("id", id)

  if (error) {
    return { success: false, error: "Anfrage konnte nicht als geprüft markiert werden." }
  }

  await supabase.from("activity_log").insert({
    actor_id: actor.id,
    entity_type: "personnel_request",
    entity_id: id,
    action: "reviewed",
  })

  if (request.created_by_id) {
    await supabase.from("notifications").insert({
      recipient_id: request.created_by_id,
      type: "request_reviewed",
      message: `Ihre Anfrage „${request.title}" wurde geprüft.`,
    })
  }

  revalidatePath("/internal/requests")
  revalidatePath(`/internal/requests/${id}`)
  return { success: true }
}
