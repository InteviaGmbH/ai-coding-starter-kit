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

async function requireActiveMunicipality() {
  const profile = await getCurrentProfile()
  if (
    !profile ||
    profile.accountStatus !== "active" ||
    profile.role !== "municipality" ||
    !profile.municipalityId
  ) {
    return null
  }
  return profile
}

export async function sendMunicipalityRequestMessage(
  requestId: string,
  input: SendMessageInput
): Promise<ActionResult> {
  const actor = await requireActiveMunicipality()
  if (!actor) {
    return { success: false, error: "Keine Berechtigung." }
  }
  if (!z.string().uuid().safeParse(requestId).success) {
    return { success: false, error: "Ungültige Anfrage." }
  }

  const parsed = sendMessageSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." }
  }

  const supabase = await createClient()

  // Defense in depth beyond RLS: confirm this request really belongs to the caller's own municipality.
  const { data: request } = await supabase
    .from("personnel_requests")
    .select("id, title, municipality_id")
    .eq("id", requestId)
    .maybeSingle()

  if (!request || request.municipality_id !== actor.municipalityId) {
    return { success: false, error: "Anfrage nicht gefunden." }
  }

  const { error } = await supabase.from("messages").insert({
    message_type: "request",
    request_id: requestId,
    content: parsed.data.content,
    subject: parsed.data.subject ?? null,
    created_by_id: actor.id,
    created_by: actor.fullName ?? actor.email,
  })

  if (error) {
    return { success: false, error: "Nachricht konnte nicht gesendet werden." }
  }

  await broadcastNewMessageToInternal(`Neue Nachricht zur Anfrage „${request.title}".`)

  revalidatePath(`/municipality/requests/${requestId}`)
  revalidatePath(`/internal/requests/${requestId}`)
  return { success: true }
}

export async function sendMunicipalityGeneralMessage(
  input: SendMessageInput
): Promise<ActionResult> {
  const actor = await requireActiveMunicipality()
  if (!actor) {
    return { success: false, error: "Keine Berechtigung." }
  }

  const parsed = sendMessageSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." }
  }

  const supabase = await createClient()

  const { error } = await supabase.from("messages").insert({
    message_type: "general_municipality",
    municipality_id: actor.municipalityId,
    content: parsed.data.content,
    subject: parsed.data.subject ?? null,
    created_by_id: actor.id,
    created_by: actor.fullName ?? actor.email,
  })

  if (error) {
    return { success: false, error: "Nachricht konnte nicht gesendet werden." }
  }

  await broadcastNewMessageToInternal("Neue allgemeine Nachricht von einer Gemeinde.")

  revalidatePath("/municipality/dashboard")
  revalidatePath(`/internal/municipalities/${actor.municipalityId}`)
  return { success: true }
}
