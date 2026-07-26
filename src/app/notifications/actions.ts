"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getCurrentProfile } from "@/lib/auth/get-current-profile"

interface ActionResult {
  success: boolean
  error?: string
}

export async function markNotificationRead(id: string): Promise<ActionResult> {
  const actor = await getCurrentProfile()
  if (!actor) {
    return { success: false, error: "Keine Berechtigung." }
  }
  if (!z.string().uuid().safeParse(id).success) {
    return { success: false, error: "Ungültige Benachrichtigung." }
  }

  const supabase = await createClient()

  const { data: updated, error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id)
    .eq("recipient_id", actor.id)
    .select("id")

  if (error || !updated || updated.length === 0) {
    return { success: false, error: "Benachrichtigung konnte nicht aktualisiert werden." }
  }

  revalidatePath("/", "layout")
  return { success: true }
}

export async function markAllNotificationsRead(): Promise<ActionResult> {
  const actor = await getCurrentProfile()
  if (!actor) {
    return { success: false, error: "Keine Berechtigung." }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("recipient_id", actor.id)
    .eq("is_read", false)

  if (error) {
    return { success: false, error: "Benachrichtigungen konnten nicht aktualisiert werden." }
  }

  revalidatePath("/", "layout")
  return { success: true }
}
