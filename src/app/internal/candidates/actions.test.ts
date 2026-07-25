import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

const activeAdminProfile = {
  id: "11111111-1111-4111-a111-111111111111",
  email: "admin@dafinex.ch",
  fullName: "Admin",
  role: "dafinex_admin" as const,
  accountStatus: "active" as const,
  municipalityId: null,
  candidateId: null,
}

const CANDIDATE_ID = "33333333-3333-4333-a333-333333333333"

function mockSupabaseClient(opts?: {
  insertError?: { message: string } | null
  updateError?: { message: string; code?: string } | null
  deleteError?: { message: string; code?: string } | null
  linkedProfilesCount?: number
}) {
  const insertError = opts?.insertError ?? null
  const updateError = opts?.updateError ?? null
  const deleteError = opts?.deleteError ?? null
  const linkedProfilesCount = opts?.linkedProfilesCount ?? 0

  const candidates = {
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(async () => ({
          data: insertError ? null : { id: CANDIDATE_ID },
          error: insertError,
        })),
      })),
    })),
    update: vi.fn(() => ({ eq: vi.fn(async () => ({ error: updateError })) })),
    delete: vi.fn(() => ({ eq: vi.fn(async () => ({ error: deleteError })) })),
  }

  const profiles = {
    select: vi.fn(() => ({
      eq: vi.fn(async () => ({ count: linkedProfilesCount })),
    })),
  }

  return {
    from: vi.fn((table: string) => {
      if (table === "candidates") return candidates
      if (table === "profiles") return profiles
      throw new Error(`unexpected table: ${table}`)
    }),
  }
}

describe("candidates server actions", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it("rejects when the caller is not an active internal role", async () => {
    vi.doMock("@/lib/auth/get-current-profile", () => ({
      getCurrentProfile: async () => ({ ...activeAdminProfile, role: "candidate" }),
      INTERNAL_ROLES: ["super_admin", "dafinex_admin", "internal_coordinator"],
    }))
    vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => mockSupabaseClient() }))

    const { createCandidate } = await import("./actions")
    const result = await createCandidate({ firstName: "Max", lastName: "Muster" })

    expect(result).toEqual({ success: false, error: "Keine Berechtigung." })
  })

  it("rejects creating a candidate without a last name", async () => {
    vi.doMock("@/lib/auth/get-current-profile", () => ({
      getCurrentProfile: async () => activeAdminProfile,
      INTERNAL_ROLES: ["super_admin", "dafinex_admin", "internal_coordinator"],
    }))
    vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => mockSupabaseClient() }))

    const { createCandidate } = await import("./actions")
    const result = await createCandidate({ firstName: "Max", lastName: "" })

    expect(result.success).toBe(false)
  })

  it("creates a candidate on the happy path with source_type dafinex", async () => {
    vi.doMock("@/lib/auth/get-current-profile", () => ({
      getCurrentProfile: async () => activeAdminProfile,
      INTERNAL_ROLES: ["super_admin", "dafinex_admin", "internal_coordinator"],
    }))
    const client = mockSupabaseClient()
    vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => client }))

    const { createCandidate } = await import("./actions")
    const result = await createCandidate({
      firstName: "Max",
      lastName: "Muster",
      skills: "Pflege, Betreuung",
    })

    expect(result).toEqual({ success: true, id: CANDIDATE_ID })
    expect(client.from("candidates").insert).toHaveBeenCalledWith(
      expect.objectContaining({ source_type: "dafinex", skills: ["Pflege", "Betreuung"] })
    )
  })

  it("refuses to delete a candidate with a linked login account", async () => {
    vi.doMock("@/lib/auth/get-current-profile", () => ({
      getCurrentProfile: async () => activeAdminProfile,
      INTERNAL_ROLES: ["super_admin", "dafinex_admin", "internal_coordinator"],
    }))
    vi.doMock("@/lib/supabase/server", () => ({
      createClient: async () => mockSupabaseClient({ linkedProfilesCount: 1 }),
    }))

    const { deleteCandidate } = await import("./actions")
    const result = await deleteCandidate(CANDIDATE_ID)

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/Login-Konto verknüpft/)
  })

  it("deletes a candidate with no linked login account", async () => {
    vi.doMock("@/lib/auth/get-current-profile", () => ({
      getCurrentProfile: async () => activeAdminProfile,
      INTERNAL_ROLES: ["super_admin", "dafinex_admin", "internal_coordinator"],
    }))
    vi.doMock("@/lib/supabase/server", () => ({
      createClient: async () => mockSupabaseClient({ linkedProfilesCount: 0 }),
    }))

    const { deleteCandidate } = await import("./actions")
    const result = await deleteCandidate(CANDIDATE_ID)

    expect(result).toEqual({ success: true })
  })
})
