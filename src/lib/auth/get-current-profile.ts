import { createClient } from "@/lib/supabase/server"

export type UserRole =
  | "super_admin"
  | "dafinex_admin"
  | "internal_coordinator"
  | "municipality"
  | "candidate"
  | "partner_company"

export type AccountStatus = "pending" | "active" | "rejected"

export interface CurrentProfile {
  id: string
  email: string
  fullName: string | null
  role: UserRole
  accountStatus: AccountStatus
  municipalityId: string | null
  candidateId: string | null
  partnerCompanyId: string | null
  hiddenDashboardWidgets: string[]
}

export const INTERNAL_ROLES: UserRole[] = [
  "super_admin",
  "dafinex_admin",
  "internal_coordinator",
]

/** Returns the logged-in user's profile, or null if not authenticated. */
export async function getCurrentProfile(): Promise<CurrentProfile | null> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "id, email, full_name, role, account_status, municipality_id, candidate_id, partner_company_id, hidden_dashboard_widgets"
    )
    .eq("id", user.id)
    .single()

  if (error || !profile) {
    return null
  }

  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    role: profile.role,
    accountStatus: profile.account_status,
    municipalityId: profile.municipality_id,
    candidateId: profile.candidate_id,
    partnerCompanyId: profile.partner_company_id,
    hiddenDashboardWidgets: profile.hidden_dashboard_widgets ?? [],
  }
}

/** Where a profile should land after login, based on role + status. */
export function getPortalPathForProfile(profile: CurrentProfile): string {
  if (profile.accountStatus === "pending") return "/pending"
  if (profile.accountStatus === "rejected") return "/rejected"
  if (INTERNAL_ROLES.includes(profile.role)) return "/internal/dashboard"
  if (profile.role === "municipality") return "/municipality/dashboard"
  if (profile.role === "candidate") return "/candidate/dashboard"
  if (profile.role === "partner_company") return "/partner/dashboard"
  return "/login"
}
