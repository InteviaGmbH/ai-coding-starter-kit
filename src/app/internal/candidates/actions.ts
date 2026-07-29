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

const candidateSchema = z.object({
  firstName: z.string().trim().min(1, "Vorname ist erforderlich"),
  lastName: z.string().trim().min(1, "Nachname ist erforderlich"),
  skills: z.string().trim().optional(),
  region: z.string().trim().optional(),
  availability: z.string().trim().optional(),
})

export type CandidateInput = z.infer<typeof candidateSchema>

async function requireInternalRole() {
  const profile = await getCurrentProfile()
  if (!profile || profile.accountStatus !== "active" || !INTERNAL_ROLES.includes(profile.role)) {
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

export async function createCandidate(input: CandidateInput): Promise<ActionResult> {
  const actor = await requireInternalRole()
  if (!actor) {
    return { success: false, error: "Keine Berechtigung." }
  }

  const parsed = candidateSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("candidates")
    .insert({
      first_name: parsed.data.firstName,
      last_name: parsed.data.lastName,
      skills: toSkillsArray(parsed.data.skills),
      region: parsed.data.region || null,
      availability: parsed.data.availability || null,
      source_type: "dafinex",
    })
    .select("id")
    .single()

  if (error || !data) {
    return { success: false, error: "Kandidat konnte nicht angelegt werden." }
  }

  revalidatePath("/internal/candidates")
  return { success: true, id: data.id }
}

export async function updateCandidate(id: string, input: CandidateInput): Promise<ActionResult> {
  const actor = await requireInternalRole()
  if (!actor) {
    return { success: false, error: "Keine Berechtigung." }
  }

  if (!z.string().uuid().safeParse(id).success) {
    return { success: false, error: "Ungültige Anfrage." }
  }

  const parsed = candidateSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("candidates")
    .update({
      first_name: parsed.data.firstName,
      last_name: parsed.data.lastName,
      skills: toSkillsArray(parsed.data.skills),
      region: parsed.data.region || null,
      availability: parsed.data.availability || null,
    })
    .eq("id", id)

  if (error) {
    return { success: false, error: "Änderungen konnten nicht gespeichert werden." }
  }

  revalidatePath("/internal/candidates")
  revalidatePath(`/internal/candidates/${id}`)
  return { success: true, id }
}

export async function deleteCandidate(id: string): Promise<ActionResult> {
  const actor = await requireInternalRole()
  if (!actor) {
    return { success: false, error: "Keine Berechtigung." }
  }

  if (!z.string().uuid().safeParse(id).success) {
    return { success: false, error: "Ungültige Anfrage." }
  }

  const supabase = await createClient()

  // profiles.candidate_id is ON DELETE SET NULL, not RESTRICT — check
  // explicitly so a linked login account isn't silently orphaned.
  const { count: linkedProfiles } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("candidate_id", id)

  if ((linkedProfiles ?? 0) > 0) {
    return {
      success: false,
      error: "Dieser Kandidat kann nicht gelöscht werden, da noch ein Login-Konto verknüpft ist.",
    }
  }

  const { error } = await supabase.from("candidates").delete().eq("id", id)

  if (error) {
    if (error.code === "23503") {
      return {
        success: false,
        error:
          "Dieser Kandidat kann nicht gelöscht werden, da noch verknüpfte Daten (z.B. Vorschläge) bestehen.",
      }
    }
    return { success: false, error: "Kandidat konnte nicht gelöscht werden." }
  }

  revalidatePath("/internal/candidates")
  return { success: true }
}

export async function setCandidateDocumentPath(id: string, path: string): Promise<ActionResult> {
  const actor = await requireInternalRole()
  if (!actor) {
    return { success: false, error: "Keine Berechtigung." }
  }

  if (!z.string().uuid().safeParse(id).success || !z.string().min(1).safeParse(path).success) {
    return { success: false, error: "Ungültige Anfrage." }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("candidates")
    .update({ cv_document_path: path, cv_uploaded_at: new Date().toISOString() })
    .eq("id", id)

  if (error) {
    return { success: false, error: "Dokument-Pfad konnte nicht gespeichert werden." }
  }

  revalidatePath(`/internal/candidates/${id}`)
  return { success: true }
}
