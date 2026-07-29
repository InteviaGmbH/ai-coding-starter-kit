"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getCurrentProfile } from "@/lib/auth/get-current-profile"

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
  return { profileId: profile.id, candidateId: profile.candidateId }
}

function toTagArray(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}

const contactSchema = z.object({
  firstName: z.string().trim().min(1, "Vorname ist erforderlich"),
  lastName: z.string().trim().min(1, "Nachname ist erforderlich"),
  phone: z.string().trim().optional(),
})

export type CandidateContactInput = z.infer<typeof contactSchema>

export async function updateCandidateContact(input: CandidateContactInput): Promise<ActionResult> {
  const actor = await requireOwnCandidateId()
  if (!actor) {
    return { success: false, error: "Keine Berechtigung." }
  }

  const parsed = contactSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." }
  }

  const supabase = await createClient()

  const { error: candidateError } = await supabase
    .from("candidates")
    .update({
      first_name: parsed.data.firstName,
      last_name: parsed.data.lastName,
      phone: parsed.data.phone || null,
    })
    .eq("id", actor.candidateId)

  if (candidateError) {
    return { success: false, error: "Änderungen konnten nicht gespeichert werden." }
  }

  // Keeps the portal header (profiles.full_name) in sync with the name
  // shown/edited here — the two are separate columns set together only
  // once, at registration.
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ full_name: `${parsed.data.firstName} ${parsed.data.lastName}` })
    .eq("id", actor.profileId)

  if (profileError) {
    return { success: false, error: "Änderungen konnten nicht gespeichert werden." }
  }

  revalidatePath("/candidate/profile")
  return { success: true }
}

const blankToUndefined = (val: unknown) => (val === "" || val === undefined || val === null ? undefined : val)

const availabilitySchema = z
  .object({
    maxWorkloadPercent: z.preprocess(blankToUndefined, z.coerce.number().int().min(0).max(100).optional()),
    availabilityStart: z.string().trim().optional(),
    availabilityEnd: z.string().trim().optional(),
  })
  .refine(
    (data) =>
      !data.availabilityStart || !data.availabilityEnd || data.availabilityEnd >= data.availabilityStart,
    { message: "Verfügbar bis darf nicht vor Verfügbar von liegen", path: ["availabilityEnd"] }
  )

export type CandidateAvailabilityInput = z.infer<typeof availabilitySchema>

export async function updateCandidateAvailability(
  input: CandidateAvailabilityInput
): Promise<ActionResult> {
  const actor = await requireOwnCandidateId()
  if (!actor) {
    return { success: false, error: "Keine Berechtigung." }
  }

  const parsed = availabilitySchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("candidates")
    .update({
      max_workload_percent: parsed.data.maxWorkloadPercent ?? null,
      availability_start: parsed.data.availabilityStart || null,
      availability_end: parsed.data.availabilityEnd || null,
    })
    .eq("id", actor.candidateId)

  if (error) {
    return { success: false, error: "Änderungen konnten nicht gespeichert werden." }
  }

  revalidatePath("/candidate/profile")
  return { success: true }
}

const qualificationsSchema = z.object({
  skills: z.string().trim().optional(),
  certifications: z.string().trim().optional(),
  languages: z.string().trim().optional(),
  experienceYears: z.preprocess(
    blankToUndefined,
    z.coerce.number().int().min(0, "Berufserfahrung darf nicht negativ sein").optional()
  ),
  preferredRegions: z.string().trim().optional(),
})

export type CandidateQualificationsInput = z.infer<typeof qualificationsSchema>

export async function updateCandidateQualifications(
  input: CandidateQualificationsInput
): Promise<ActionResult> {
  const actor = await requireOwnCandidateId()
  if (!actor) {
    return { success: false, error: "Keine Berechtigung." }
  }

  const parsed = qualificationsSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("candidates")
    .update({
      skills: toTagArray(parsed.data.skills),
      certifications: toTagArray(parsed.data.certifications),
      languages: toTagArray(parsed.data.languages),
      experience_years: parsed.data.experienceYears ?? null,
      preferred_regions: toTagArray(parsed.data.preferredRegions),
    })
    .eq("id", actor.candidateId)

  if (error) {
    return { success: false, error: "Änderungen konnten nicht gespeichert werden." }
  }

  revalidatePath("/candidate/profile")
  return { success: true }
}

export async function setOwnCandidateDocumentPath(
  candidateId: string,
  path: string
): Promise<ActionResult> {
  const actor = await requireOwnCandidateId()
  if (!actor) {
    return { success: false, error: "Keine Berechtigung." }
  }

  // Defense in depth beyond RLS: the component always passes the caller's
  // own candidateId, but never trust a client-supplied id blindly.
  if (candidateId !== actor.candidateId) {
    return { success: false, error: "Keine Berechtigung." }
  }

  if (!z.string().min(1).safeParse(path).success) {
    return { success: false, error: "Ungültige Anfrage." }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("candidates")
    .update({ cv_document_path: path })
    .eq("id", candidateId)

  if (error) {
    return { success: false, error: "Dokument-Pfad konnte nicht gespeichert werden." }
  }

  revalidatePath("/candidate/profile")
  return { success: true }
}
