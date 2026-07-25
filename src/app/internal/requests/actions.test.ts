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

const REQUEST_ID = "44444444-4444-4444-a444-444444444444"

function mockSupabaseClient(opts?: {
  request?: { status: string; title: string; created_by_id: string | null } | null
  updateError?: { message: string } | null
}) {
  const request = opts?.request ?? {
    status: "created",
    title: "Sozialarbeiter:in",
    created_by_id: "55555555-5555-4555-a555-555555555555",
  }
  const updateError = opts?.updateError ?? null

  const insert = vi.fn(async () => ({ error: null }))

  const personnelRequests = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(async () => ({ data: request, error: null })),
      })),
    })),
    update: vi.fn(() => ({ eq: vi.fn(async () => ({ error: updateError })) })),
  }

  return {
    from: vi.fn((table: string) => {
      if (table === "personnel_requests") return personnelRequests
      if (table === "activity_log") return { insert }
      if (table === "notifications") return { insert }
      throw new Error(`unexpected table: ${table}`)
    }),
  }
}

describe("markRequestReviewed", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it("rejects when the caller is not an active internal role", async () => {
    vi.doMock("@/lib/auth/get-current-profile", () => ({
      getCurrentProfile: async () => ({ ...activeAdminProfile, role: "municipality" }),
      INTERNAL_ROLES: ["super_admin", "dafinex_admin", "internal_coordinator"],
    }))
    vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => mockSupabaseClient() }))

    const { markRequestReviewed } = await import("./actions")
    const result = await markRequestReviewed(REQUEST_ID)

    expect(result).toEqual({ success: false, error: "Keine Berechtigung." })
  })

  it("marks an unreviewed request as reviewed and logs activity + notification", async () => {
    vi.doMock("@/lib/auth/get-current-profile", () => ({
      getCurrentProfile: async () => activeAdminProfile,
      INTERNAL_ROLES: ["super_admin", "dafinex_admin", "internal_coordinator"],
    }))
    const client = mockSupabaseClient()
    vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => client }))

    const { markRequestReviewed } = await import("./actions")
    const result = await markRequestReviewed(REQUEST_ID)

    expect(result).toEqual({ success: true })
    expect(client.from("activity_log").insert).toHaveBeenCalledWith(
      expect.objectContaining({ action: "reviewed", entity_type: "personnel_request" })
    )
    expect(client.from("notifications").insert).toHaveBeenCalledWith(
      expect.objectContaining({ recipient_id: "55555555-5555-4555-a555-555555555555" })
    )
  })

  it("is idempotent: reviewing an already-reviewed request does nothing again", async () => {
    vi.doMock("@/lib/auth/get-current-profile", () => ({
      getCurrentProfile: async () => activeAdminProfile,
      INTERNAL_ROLES: ["super_admin", "dafinex_admin", "internal_coordinator"],
    }))
    const client = mockSupabaseClient({
      request: { status: "reviewed", title: "x", created_by_id: null },
    })
    vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => client }))

    const { markRequestReviewed } = await import("./actions")
    const result = await markRequestReviewed(REQUEST_ID)

    expect(result).toEqual({ success: true })
    expect(client.from("activity_log").insert).not.toHaveBeenCalled()
    expect(client.from("notifications").insert).not.toHaveBeenCalled()
  })
})
