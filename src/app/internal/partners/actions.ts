"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getCurrentProfile, INTERNAL_ROLES } from "@/lib/auth/get-current-profile"

// Server Actions have no `window.location.origin` — reconstruct it from
// request headers instead, same source get-request-metadata.ts already
// reads from for the contract-signature audit trail.
async function getAppOrigin(): Promise<string> {
  const headerList = await headers()
  const host = headerList.get("host")
  const proto = headerList.get("x-forwarded-proto") ?? (process.env.NODE_ENV === "development" ? "http" : "https")
  return `${proto}://${host}`
}

interface ActionResult {
  success: boolean
  error?: string
  id?: string
}

async function requireInternalRole() {
  const profile = await getCurrentProfile()
  if (!profile || profile.accountStatus !== "active" || !INTERNAL_ROLES.includes(profile.role)) {
    return null
  }
  return profile
}

// Creating the first login account for a partner firm assigns a privileged
// role (partner_company) to a brand-new auth user — same trust level as
// approving a self-registered account, so it's restricted the same way
// approveMunicipalityAccount/approveCandidateAccount are (dafinex_admin/
// super_admin only, not internal_coordinator).
async function requireDafinexAdmin() {
  const profile = await getCurrentProfile()
  if (!profile || profile.accountStatus !== "active" || !INTERNAL_ROLES.includes(profile.role)) {
    return null
  }
  if (profile.role !== "dafinex_admin" && profile.role !== "super_admin") {
    return null
  }
  return profile
}

const companyFieldsSchema = z.object({
  name: z.string().trim().min(1, "Name ist erforderlich"),
  address: z.string().trim().optional().nullable(),
  contactName: z.string().trim().optional().nullable(),
  contactEmail: z.string().trim().email("Ungültige E-Mail-Adresse").optional().or(z.literal("")).nullable(),
  contactPhone: z.string().trim().optional().nullable(),
  commissionRate: z.coerce.number().min(0, "Provision darf nicht negativ sein").max(100, "Provision darf 100% nicht überschreiten").optional().nullable(),
})

const createPartnerCompanySchema = companyFieldsSchema.extend({
  firstUserEmail: z.string().trim().email("Ungültige E-Mail-Adresse"),
  firstUserFullName: z.string().trim().min(1, "Name des Ansprechpartners ist erforderlich"),
})

export type PartnerCompanyInput = z.infer<typeof companyFieldsSchema>
export type CreatePartnerCompanyInput = z.infer<typeof createPartnerCompanySchema>

// Postgres foreign-key violation ("on delete restrict") — surfaced by Supabase as this code.
const FK_VIOLATION = "23503"

export async function createPartnerCompany(input: CreatePartnerCompanyInput): Promise<ActionResult> {
  const actor = await requireDafinexAdmin()
  if (!actor) {
    return { success: false, error: "Keine Berechtigung." }
  }

  const parsed = createPartnerCompanySchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." }
  }

  const supabase = await createClient()

  const { data: company, error: companyError } = await supabase
    .from("partner_companies")
    .insert({
      name: parsed.data.name,
      address: parsed.data.address || null,
      contact_name: parsed.data.contactName || null,
      contact_email: parsed.data.contactEmail || null,
      contact_phone: parsed.data.contactPhone || null,
      commission_rate: parsed.data.commissionRate ?? null,
      created_by_id: actor.id,
      created_by: actor.fullName ?? actor.email,
    })
    .select("id")
    .single()

  if (companyError || !company) {
    return { success: false, error: "Partnerfirma konnte nicht angelegt werden." }
  }

  // No auth.signUp / email confirmation — this is an internal, immediately-
  // active account, not a self-registration. inviteUserByEmail() sends the
  // user a link to set their own password; account_status is set to
  // 'active' below right away, there is no pending-approval step for
  // internally created accounts.
  const admin = createAdminClient()
  const origin = await getAppOrigin()
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    parsed.data.firstUserEmail,
    {
      data: { full_name: parsed.data.firstUserFullName },
      // Without this, Supabase falls back to the project's default Site
      // URL and the invite link never reaches a page that can actually set
      // a password — same redirect target the existing "Passwort
      // vergessen"-flow already uses (forgot-password-form.tsx).
      redirectTo: `${origin}/reset-password`,
    }
  )

  if (inviteError || !invited?.user) {
    // Roll back the otherwise-orphaned company record.
    await supabase.from("partner_companies").delete().eq("id", company.id)
    return {
      success: false,
      error: inviteError?.message.includes("already been registered")
        ? "Für diese E-Mail-Adresse besteht bereits ein Konto."
        : "Nutzerkonto konnte nicht eingeladen werden.",
    }
  }

  // handle_new_user() (unchanged, PROJ-1) just created a profile row with
  // role='candidate', account_status='pending' — no role was passed in the
  // invite metadata, since anything other than municipality/candidate there
  // would make the trigger reject the whole signup. Elevate it to the
  // intended partner_company role now, via the same
  // profiles_update_by_dafinex_admin policy approveMunicipalityAccount uses.
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      role: "partner_company",
      partner_company_id: company.id,
      account_status: "active",
    })
    .eq("id", invited.user.id)

  if (profileError) {
    // Leave the company record in place — the invite already went out and
    // can't be un-sent — but avoid a permanently stuck half-configured auth
    // user blocking a retry with the same email.
    await admin.auth.admin.deleteUser(invited.user.id)
    return { success: false, error: "Nutzerkonto konnte nicht der Partnerfirma zugeordnet werden." }
  }

  revalidatePath("/internal/partners")
  return { success: true, id: company.id }
}

export async function updatePartnerCompany(
  id: string,
  input: PartnerCompanyInput
): Promise<ActionResult> {
  const actor = await requireInternalRole()
  if (!actor) {
    return { success: false, error: "Keine Berechtigung." }
  }

  if (!z.string().uuid().safeParse(id).success) {
    return { success: false, error: "Ungültige Anfrage." }
  }

  const parsed = companyFieldsSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("partner_companies")
    .update({
      name: parsed.data.name,
      address: parsed.data.address || null,
      contact_name: parsed.data.contactName || null,
      contact_email: parsed.data.contactEmail || null,
      contact_phone: parsed.data.contactPhone || null,
      commission_rate: parsed.data.commissionRate ?? null,
    })
    .eq("id", id)

  if (error) {
    return { success: false, error: "Änderungen konnten nicht gespeichert werden." }
  }

  revalidatePath("/internal/partners")
  revalidatePath(`/internal/partners/${id}`)
  return { success: true, id }
}

export async function deletePartnerCompany(id: string): Promise<ActionResult> {
  const actor = await requireInternalRole()
  if (!actor) {
    return { success: false, error: "Keine Berechtigung." }
  }

  if (!z.string().uuid().safeParse(id).success) {
    return { success: false, error: "Ungültige Anfrage." }
  }

  const supabase = await createClient()

  // profiles.partner_company_id is ON DELETE SET NULL (not RESTRICT) —
  // mirrors deleteMunicipality's reasoning exactly: deleting would silently
  // orphan linked accounts instead of failing at the DB level.
  const { count: linkedProfiles } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("partner_company_id", id)

  if ((linkedProfiles ?? 0) > 0) {
    return {
      success: false,
      error:
        "Diese Partnerfirma kann nicht gelöscht werden, da noch verknüpfte Nutzerkonten bestehen.",
    }
  }

  const { error } = await supabase.from("partner_companies").delete().eq("id", id)

  if (error) {
    if (error.code === FK_VIOLATION) {
      return {
        success: false,
        error:
          "Diese Partnerfirma kann nicht gelöscht werden, da noch verknüpfte Daten (z.B. Kandidaten) bestehen.",
      }
    }
    return { success: false, error: "Partnerfirma konnte nicht gelöscht werden." }
  }

  revalidatePath("/internal/partners")
  return { success: true }
}
