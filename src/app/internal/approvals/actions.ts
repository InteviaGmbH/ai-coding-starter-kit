"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getCurrentProfile, INTERNAL_ROLES } from "@/lib/auth/get-current-profile"

interface ActionResult {
  success: boolean
  error?: string
}

const uuidSchema = z.string().uuid()

async function requireDafinexAdmin() {
  const profile = await getCurrentProfile()
  if (!profile || profile.accountStatus !== "active" || !INTERNAL_ROLES.includes(profile.role)) {
    return null
  }
  // Only dafinex_admin/super_admin may approve or reject — RLS enforces this
  // too, but checking here gives a clean error message instead of a failed
  // silent update (0 rows affected).
  if (profile.role !== "dafinex_admin" && profile.role !== "super_admin") {
    return null
  }
  return profile
}

export async function approveMunicipalityAccount(
  profileId: string,
  municipalityId: string
): Promise<ActionResult> {
  const actor = await requireDafinexAdmin()
  if (!actor) {
    return { success: false, error: "Keine Berechtigung." }
  }

  const parsed = z.object({ profileId: uuidSchema, municipalityId: uuidSchema }).safeParse({
    profileId,
    municipalityId,
  })
  if (!parsed.success) {
    return { success: false, error: "Bitte eine Gemeinde auswählen." }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from("profiles")
    .update({ account_status: "active", municipality_id: municipalityId })
    .eq("id", profileId)
    .eq("role", "municipality")

  if (error) {
    return { success: false, error: "Freischaltung fehlgeschlagen." }
  }

  await supabase.from("notifications").insert({
    recipient_id: profileId,
    type: "account_approved",
    message: "Ihr Konto wurde freigeschaltet. Sie können sich jetzt einloggen.",
  })

  revalidatePath("/internal/approvals")
  return { success: true }
}

export async function approveCandidateAccount(profileId: string): Promise<ActionResult> {
  const actor = await requireDafinexAdmin()
  if (!actor) {
    return { success: false, error: "Keine Berechtigung." }
  }

  if (!uuidSchema.safeParse(profileId).success) {
    return { success: false, error: "Ungültige Anfrage." }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from("profiles")
    .update({ account_status: "active" })
    .eq("id", profileId)
    .eq("role", "candidate")

  if (error) {
    return { success: false, error: "Freischaltung fehlgeschlagen." }
  }

  await supabase.from("notifications").insert({
    recipient_id: profileId,
    type: "account_approved",
    message: "Ihr Konto wurde freigeschaltet. Sie können sich jetzt einloggen.",
  })

  revalidatePath("/internal/approvals")
  return { success: true }
}

export async function rejectAccount(profileId: string): Promise<ActionResult> {
  const actor = await requireDafinexAdmin()
  if (!actor) {
    return { success: false, error: "Keine Berechtigung." }
  }

  if (!uuidSchema.safeParse(profileId).success) {
    return { success: false, error: "Ungültige Anfrage." }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from("profiles")
    .update({ account_status: "rejected" })
    .eq("id", profileId)

  if (error) {
    return { success: false, error: "Ablehnung fehlgeschlagen." }
  }

  await supabase.from("notifications").insert({
    recipient_id: profileId,
    type: "account_rejected",
    message: "Ihre Registrierung wurde leider nicht freigeschaltet.",
  })

  revalidatePath("/internal/approvals")
  return { success: true }
}
