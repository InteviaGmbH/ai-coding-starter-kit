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

const municipalitySchema = z.object({
  name: z.string().trim().min(1, "Name ist erforderlich"),
  address: z.string().trim().optional().nullable(),
  contactName: z.string().trim().optional().nullable(),
  contactEmail: z.string().trim().email("Ungültige E-Mail-Adresse").optional().or(z.literal("")).nullable(),
  contactPhone: z.string().trim().optional().nullable(),
})

export type MunicipalityInput = z.infer<typeof municipalitySchema>

async function requireInternalRole() {
  const profile = await getCurrentProfile()
  if (!profile || profile.accountStatus !== "active" || !INTERNAL_ROLES.includes(profile.role)) {
    return null
  }
  return profile
}

// Postgres foreign-key violation ("on delete restrict") — surfaced by Supabase as this code.
const FK_VIOLATION = "23503"

export async function createMunicipality(input: MunicipalityInput): Promise<ActionResult> {
  const actor = await requireInternalRole()
  if (!actor) {
    return { success: false, error: "Keine Berechtigung." }
  }

  const parsed = municipalitySchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("municipalities")
    .insert({
      name: parsed.data.name,
      address: parsed.data.address || null,
      contact_name: parsed.data.contactName || null,
      contact_email: parsed.data.contactEmail || null,
      contact_phone: parsed.data.contactPhone || null,
    })
    .select("id")
    .single()

  if (error || !data) {
    return { success: false, error: "Gemeinde konnte nicht angelegt werden." }
  }

  revalidatePath("/internal/municipalities")
  return { success: true, id: data.id }
}

export async function updateMunicipality(
  id: string,
  input: MunicipalityInput
): Promise<ActionResult> {
  const actor = await requireInternalRole()
  if (!actor) {
    return { success: false, error: "Keine Berechtigung." }
  }

  if (!z.string().uuid().safeParse(id).success) {
    return { success: false, error: "Ungültige Anfrage." }
  }

  const parsed = municipalitySchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("municipalities")
    .update({
      name: parsed.data.name,
      address: parsed.data.address || null,
      contact_name: parsed.data.contactName || null,
      contact_email: parsed.data.contactEmail || null,
      contact_phone: parsed.data.contactPhone || null,
    })
    .eq("id", id)

  if (error) {
    return { success: false, error: "Änderungen konnten nicht gespeichert werden." }
  }

  revalidatePath("/internal/municipalities")
  revalidatePath(`/internal/municipalities/${id}`)
  return { success: true, id }
}

export async function deleteMunicipality(id: string): Promise<ActionResult> {
  const actor = await requireInternalRole()
  if (!actor) {
    return { success: false, error: "Keine Berechtigung." }
  }

  if (!z.string().uuid().safeParse(id).success) {
    return { success: false, error: "Ungültige Anfrage." }
  }

  const supabase = await createClient()

  // profiles.municipality_id is ON DELETE SET NULL (not RESTRICT) — deleting
  // would silently orphan any linked contact account instead of failing at
  // the DB level, so we check explicitly first rather than relying on a
  // constraint error that won't actually fire for this relationship.
  const { count: linkedProfiles } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("municipality_id", id)

  if ((linkedProfiles ?? 0) > 0) {
    return {
      success: false,
      error:
        "Diese Gemeinde kann nicht gelöscht werden, da noch verknüpfte Ansprechpartner-Konten bestehen.",
    }
  }

  const { error } = await supabase.from("municipalities").delete().eq("id", id)

  if (error) {
    if (error.code === FK_VIOLATION) {
      return {
        success: false,
        error:
          "Diese Gemeinde kann nicht gelöscht werden, da noch verknüpfte Daten (z.B. Personalanfragen) bestehen.",
      }
    }
    return { success: false, error: "Gemeinde konnte nicht gelöscht werden." }
  }

  revalidatePath("/internal/municipalities")
  return { success: true }
}
