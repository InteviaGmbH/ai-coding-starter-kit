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

const MUNICIPALITY_ID = "22222222-2222-4222-a222-222222222222"

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

  function updateChain(): any {
    return { eq: vi.fn(() => ({ error: updateError })) }
  }

  const municipalities = {
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(async () => ({
          data: insertError ? null : { id: MUNICIPALITY_ID },
          error: insertError,
        })),
      })),
    })),
    update: vi.fn(() => updateChain()),
    delete: vi.fn(() => ({ eq: vi.fn(async () => ({ error: deleteError })) })),
  }

  const profiles = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        head: undefined,
        eq: vi.fn(async () => ({ count: linkedProfilesCount })),
        then: (resolve: (v: { count: number }) => void) => resolve({ count: linkedProfilesCount }),
      })),
    })),
  }

  return {
    from: vi.fn((table: string) => {
      if (table === "municipalities") return municipalities
      if (table === "profiles") return profiles
      throw new Error(`unexpected table: ${table}`)
    }),
  }
}

describe("municipalities server actions", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it("rejects when the caller is not an active internal role", async () => {
    vi.doMock("@/lib/auth/get-current-profile", () => ({
      getCurrentProfile: async () => ({ ...activeAdminProfile, role: "municipality" }),
      INTERNAL_ROLES: ["super_admin", "dafinex_admin", "internal_coordinator"],
    }))
    vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => mockSupabaseClient() }))

    const { createMunicipality } = await import("./actions")
    const result = await createMunicipality({ name: "Musterstadt" })

    expect(result).toEqual({ success: false, error: "Keine Berechtigung." })
  })

  it("rejects creating a municipality with an empty name", async () => {
    vi.doMock("@/lib/auth/get-current-profile", () => ({
      getCurrentProfile: async () => activeAdminProfile,
      INTERNAL_ROLES: ["super_admin", "dafinex_admin", "internal_coordinator"],
    }))
    vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => mockSupabaseClient() }))

    const { createMunicipality } = await import("./actions")
    const result = await createMunicipality({ name: "  " })

    expect(result.success).toBe(false)
  })

  it("creates a municipality on the happy path", async () => {
    vi.doMock("@/lib/auth/get-current-profile", () => ({
      getCurrentProfile: async () => activeAdminProfile,
      INTERNAL_ROLES: ["super_admin", "dafinex_admin", "internal_coordinator"],
    }))
    vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => mockSupabaseClient() }))

    const { createMunicipality } = await import("./actions")
    const result = await createMunicipality({ name: "Musterstadt" })

    expect(result).toEqual({ success: true, id: MUNICIPALITY_ID })
  })

  it("refuses to delete a municipality with linked profiles", async () => {
    vi.doMock("@/lib/auth/get-current-profile", () => ({
      getCurrentProfile: async () => activeAdminProfile,
      INTERNAL_ROLES: ["super_admin", "dafinex_admin", "internal_coordinator"],
    }))
    vi.doMock("@/lib/supabase/server", () => ({
      createClient: async () => mockSupabaseClient({ linkedProfilesCount: 2 }),
    }))

    const { deleteMunicipality } = await import("./actions")
    const result = await deleteMunicipality(MUNICIPALITY_ID)

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/verknüpfte Ansprechpartner-Konten/)
  })

  it("deletes a municipality with no linked profiles", async () => {
    vi.doMock("@/lib/auth/get-current-profile", () => ({
      getCurrentProfile: async () => activeAdminProfile,
      INTERNAL_ROLES: ["super_admin", "dafinex_admin", "internal_coordinator"],
    }))
    vi.doMock("@/lib/supabase/server", () => ({
      createClient: async () => mockSupabaseClient({ linkedProfilesCount: 0 }),
    }))

    const { deleteMunicipality } = await import("./actions")
    const result = await deleteMunicipality(MUNICIPALITY_ID)

    expect(result).toEqual({ success: true })
  })
})
