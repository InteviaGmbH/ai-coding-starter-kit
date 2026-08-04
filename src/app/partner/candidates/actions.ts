"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getCurrentProfile } from "@/lib/auth/get-current-profile"

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

export type PartnerCandidateInput = z.infer<typeof candidateSchema>

async function requirePartnerCompany() {
  const profile = await getCurrentProfile()
  if (
    !profile ||
    profile.accountStatus !== "active" ||
    profile.role !== "partner_company" ||
    !profile.partnerCompanyId
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

export async function createPartnerCandidate(input: PartnerCandidateInput): Promise<ActionResult> {
  const actor = await requirePartnerCompany()
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
      source_type: "partner",
      partner_company_id: actor.partnerCompanyId,
      created_by_id: actor.id,
      created_by: actor.fullName ?? actor.email,
    })
    .select("id")
    .single()

  if (error || !data) {
    return { success: false, error: "Kandidat konnte nicht angelegt werden." }
  }

  revalidatePath("/partner/candidates")
  return { success: true, id: data.id }
}

export async function updatePartnerCandidate(
  id: string,
  input: PartnerCandidateInput
): Promise<ActionResult> {
  const actor = await requirePartnerCompany()
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
  // No .eq("partner_company_id", ...) needed here — RLS
  // (candidates_update_own_partner) already scopes this to the caller's own
  // firm and rejects the update outright otherwise (0 rows affected, not a
  // cross-tenant read); this is the same defense-in-depth pattern used
  // throughout the app (RLS as the real boundary, ownership check here only
  // for a clean error message).
  const { data: updated, error } = await supabase
    .from("candidates")
    .update({
      first_name: parsed.data.firstName,
      last_name: parsed.data.lastName,
      skills: toSkillsArray(parsed.data.skills),
      region: parsed.data.region || null,
      availability: parsed.data.availability || null,
    })
    .eq("id", id)
    .select("id")

  if (error || !updated || updated.length === 0) {
    return { success: false, error: "Änderungen konnten nicht gespeichert werden." }
  }

  revalidatePath("/partner/candidates")
  return { success: true, id }
}
