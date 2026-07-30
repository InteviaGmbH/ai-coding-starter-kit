"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getCurrentProfile } from "@/lib/auth/get-current-profile"

interface ActionResult {
  success: boolean
  error?: string
  id?: string
}

const blankToUndefined = (val: unknown) => (val === "" || val === undefined || val === null ? undefined : val)

const requestSchema = z
  .object({
    title: z.string().trim().min(1, "Titel/Rolle ist erforderlich"),
    requiredSkills: z.string().trim().optional(),
    region: z.string().trim().optional(),
    startDate: z.string().trim().min(1, "Startdatum ist erforderlich"),
    endDate: z.string().trim().optional(),
    requiredWorkloadPercent: z.preprocess(
      blankToUndefined,
      z.coerce.number().int().min(0).max(100).optional()
    ),
  })
  .refine((data) => !data.endDate || data.endDate >= data.startDate, {
    message: "Enddatum darf nicht vor dem Startdatum liegen",
    path: ["endDate"],
  })

export type PersonnelRequestInput = z.infer<typeof requestSchema>

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

function toSkillsArray(skills: string | undefined) {
  return (skills ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}

export async function createPersonnelRequest(
  input: PersonnelRequestInput
): Promise<ActionResult> {
  const actor = await requireActiveMunicipality()
  if (!actor) {
    return { success: false, error: "Keine Berechtigung." }
  }

  const parsed = requestSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("personnel_requests")
    // municipality_id always comes from the actor's own profile, never from
    // client input — the same lesson as PROJ-1's BUG-2 applied here.
    // created_by_id has no DB default, so it's set explicitly here — it's
    // how markRequestReviewed() later knows whom to notify.
    .insert({
      municipality_id: actor.municipalityId,
      created_by_id: actor.id,
      created_by: actor.fullName ?? actor.email,
      title: parsed.data.title,
      required_skills: toSkillsArray(parsed.data.requiredSkills),
      region: parsed.data.region || null,
      start_date: parsed.data.startDate,
      end_date: parsed.data.endDate || null,
      required_workload_percent: parsed.data.requiredWorkloadPercent ?? null,
    })
    .select("id")
    .single()

  if (error || !data) {
    return { success: false, error: "Anfrage konnte nicht angelegt werden." }
  }

  // Admin client is used read-only here to find active internal recipients —
  // a municipality actor has no RLS access to other profiles rows. The
  // actual notification insert below still goes through the normal,
  // RLS-checked client (notifications_insert_municipality_new_request).
  const admin = createAdminClient()
  const { data: internalProfiles } = await admin
    .from("profiles")
    .select("id")
    .in("role", ["super_admin", "dafinex_admin", "internal_coordinator"])
    .eq("account_status", "active")

  if (internalProfiles && internalProfiles.length > 0) {
    await supabase.from("notifications").insert(
      internalProfiles.map((p) => ({
        recipient_id: p.id,
        type: "new_request",
        message: `Neue Anfrage „${parsed.data.title}" wurde erstellt.`,
      })),
    )
  }

  revalidatePath("/municipality/requests")
  return { success: true, id: data.id }
}

export async function updatePersonnelRequest(
  id: string,
  input: PersonnelRequestInput
): Promise<ActionResult> {
  const actor = await requireActiveMunicipality()
  if (!actor) {
    return { success: false, error: "Keine Berechtigung." }
  }

  if (!z.string().uuid().safeParse(id).success) {
    return { success: false, error: "Ungültige Anfrage." }
  }

  const parsed = requestSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." }
  }

  const supabase = await createClient()

  // Only the owning municipality may edit, and only while still "created" —
  // RLS also restricts personnel_requests_update to internal roles only, so
  // this update must go through a security-definer-free path: we rely on
  // the municipality being able to update only via this explicit status
  // check plus ownership, mirrored by a dedicated RLS policy (see migration).
  const { data: existing } = await supabase
    .from("personnel_requests")
    .select("status, municipality_id")
    .eq("id", id)
    .single()

  if (!existing || existing.municipality_id !== actor.municipalityId) {
    return { success: false, error: "Anfrage nicht gefunden." }
  }
  if (existing.status !== "created") {
    return {
      success: false,
      error: "Diese Anfrage wurde bereits geprüft und kann nicht mehr bearbeitet werden.",
    }
  }

  const { data: updated, error } = await supabase
    .from("personnel_requests")
    .update({
      title: parsed.data.title,
      required_skills: toSkillsArray(parsed.data.requiredSkills),
      region: parsed.data.region || null,
      start_date: parsed.data.startDate,
      end_date: parsed.data.endDate || null,
      required_workload_percent: parsed.data.requiredWorkloadPercent ?? null,
    })
    .eq("id", id)
    .select("id")

  // RLS blocking a write returns no error, just zero affected rows — check
  // explicitly rather than assuming success whenever `error` is null.
  if (error || !updated || updated.length === 0) {
    return { success: false, error: "Änderungen konnten nicht gespeichert werden." }
  }

  revalidatePath("/municipality/requests")
  revalidatePath(`/municipality/requests/${id}`)
  return { success: true, id }
}

export async function withdrawPersonnelRequest(id: string): Promise<ActionResult> {
  const actor = await requireActiveMunicipality()
  if (!actor) {
    return { success: false, error: "Keine Berechtigung." }
  }

  if (!z.string().uuid().safeParse(id).success) {
    return { success: false, error: "Ungültige Anfrage." }
  }

  const supabase = await createClient()

  const { data: existing } = await supabase
    .from("personnel_requests")
    .select("status, municipality_id")
    .eq("id", id)
    .single()

  if (!existing || existing.municipality_id !== actor.municipalityId) {
    return { success: false, error: "Anfrage nicht gefunden." }
  }
  if (existing.status !== "created") {
    return {
      success: false,
      error: "Diese Anfrage wurde bereits geprüft und kann nicht mehr zurückgezogen werden.",
    }
  }

  const { data: deleted, error } = await supabase
    .from("personnel_requests")
    .delete()
    .eq("id", id)
    .select("id")

  if (error || !deleted || deleted.length === 0) {
    return { success: false, error: "Anfrage konnte nicht zurückgezogen werden." }
  }

  revalidatePath("/municipality/requests")
  return { success: true }
}
