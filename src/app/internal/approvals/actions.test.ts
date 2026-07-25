import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

const activeAdminProfile = {
  id: "11111111-1111-1111-1111-111111111111",
  email: "admin@dafinex.ch",
  fullName: "Admin",
  role: "dafinex_admin" as const,
  accountStatus: "active" as const,
  municipalityId: null,
  candidateId: null,
}

function mockSupabaseClient(updateError: { message: string } | null = null) {
  // Chainable + thenable: supports .eq().eq() (municipality/candidate approve)
  // as well as a single .eq() (reject), resolving to { error } either way.
  function chain(): any {
    return {
      eq: vi.fn(() => chain()),
      then: (resolve: (v: { error: typeof updateError }) => void) =>
        resolve({ error: updateError }),
    }
  }

  const update = vi.fn(() => chain())
  const insert = vi.fn(async () => ({ error: null }))

  return {
    from: vi.fn((table: string) => {
      if (table === "profiles") return { update }
      if (table === "notifications") return { insert }
      throw new Error(`unexpected table: ${table}`)
    }),
  }
}

describe("approvals server actions", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it("rejects when the caller is not an active dafinex_admin/super_admin", async () => {
    vi.doMock("@/lib/auth/get-current-profile", () => ({
      getCurrentProfile: async () => ({ ...activeAdminProfile, role: "internal_coordinator" }),
      INTERNAL_ROLES: ["super_admin", "dafinex_admin", "internal_coordinator"],
    }))
    vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => mockSupabaseClient() }))

    const { approveCandidateAccount } = await import("./actions")
    const result = await approveCandidateAccount("22222222-2222-4222-a222-222222222222")

    expect(result).toEqual({ success: false, error: "Keine Berechtigung." })
  })

  it("rejects municipality approval without a valid municipalityId", async () => {
    vi.doMock("@/lib/auth/get-current-profile", () => ({
      getCurrentProfile: async () => activeAdminProfile,
      INTERNAL_ROLES: ["super_admin", "dafinex_admin", "internal_coordinator"],
    }))
    vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => mockSupabaseClient() }))

    const { approveMunicipalityAccount } = await import("./actions")
    const result = await approveMunicipalityAccount(
      "22222222-2222-4222-a222-222222222222",
      "not-a-uuid"
    )

    expect(result).toEqual({ success: false, error: "Bitte eine Gemeinde auswählen." })
  })

  it("approves a candidate account on the happy path", async () => {
    vi.doMock("@/lib/auth/get-current-profile", () => ({
      getCurrentProfile: async () => activeAdminProfile,
      INTERNAL_ROLES: ["super_admin", "dafinex_admin", "internal_coordinator"],
    }))
    vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => mockSupabaseClient() }))

    const { approveCandidateAccount } = await import("./actions")
    const result = await approveCandidateAccount("22222222-2222-4222-a222-222222222222")

    expect(result).toEqual({ success: true })
  })

  it("surfaces a friendly error when the database update fails", async () => {
    vi.doMock("@/lib/auth/get-current-profile", () => ({
      getCurrentProfile: async () => activeAdminProfile,
      INTERNAL_ROLES: ["super_admin", "dafinex_admin", "internal_coordinator"],
    }))
    vi.doMock("@/lib/supabase/server", () => ({
      createClient: async () => mockSupabaseClient({ message: "db down" }),
    }))

    const { rejectAccount } = await import("./actions")
    const result = await rejectAccount("22222222-2222-4222-a222-222222222222")

    expect(result).toEqual({ success: false, error: "Ablehnung fehlgeschlagen." })
  })
})
