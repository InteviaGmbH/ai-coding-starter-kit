import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

const activeMunicipalityProfile = {
  id: "11111111-1111-4111-a111-111111111111",
  email: "gemeinde@example.com",
  fullName: "Gemeinde Muster",
  role: "municipality" as const,
  accountStatus: "active" as const,
  municipalityId: "22222222-2222-4222-a222-222222222222",
  candidateId: null,
}

const REQUEST_ID = "44444444-4444-4444-a444-444444444444"

function mockSupabaseClient(opts?: {
  insertError?: { message: string } | null
  existing?: { status: string; municipality_id: string } | null
  updateResultLength?: number
  deleteResultLength?: number
}) {
  const insertError = opts?.insertError ?? null
  const existing = opts?.existing ?? { status: "created", municipality_id: activeMunicipalityProfile.municipalityId }
  const updateResultLength = opts?.updateResultLength ?? 1
  const deleteResultLength = opts?.deleteResultLength ?? 1

  const personnelRequests = {
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(async () => ({
          data: insertError ? null : { id: REQUEST_ID },
          error: insertError,
        })),
      })),
    })),
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(async () => ({ data: existing, error: null })),
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(async () => ({
          data: Array.from({ length: updateResultLength }, () => ({ id: REQUEST_ID })),
          error: null,
        })),
      })),
    })),
    delete: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(async () => ({
          data: Array.from({ length: deleteResultLength }, () => ({ id: REQUEST_ID })),
          error: null,
        })),
      })),
    })),
  }

  return {
    from: vi.fn((table: string) => {
      if (table === "personnel_requests") return personnelRequests
      throw new Error(`unexpected table: ${table}`)
    }),
  }
}

describe("municipality requests server actions", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it("rejects when the caller is not an active municipality profile", async () => {
    vi.doMock("@/lib/auth/get-current-profile", () => ({
      getCurrentProfile: async () => ({ ...activeMunicipalityProfile, role: "candidate" }),
    }))
    vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => mockSupabaseClient() }))

    const { createPersonnelRequest } = await import("./actions")
    const result = await createPersonnelRequest({ title: "Test", startDate: "2026-08-01" })

    expect(result).toEqual({ success: false, error: "Keine Berechtigung." })
  })

  it("creates a request with municipality_id from the actor's own profile", async () => {
    vi.doMock("@/lib/auth/get-current-profile", () => ({
      getCurrentProfile: async () => activeMunicipalityProfile,
    }))
    const client = mockSupabaseClient()
    vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => client }))

    const { createPersonnelRequest } = await import("./actions")
    const result = await createPersonnelRequest({ title: "Sozialarbeiter:in", startDate: "2026-08-01" })

    expect(result).toEqual({ success: true, id: REQUEST_ID })
    expect(client.from("personnel_requests").insert).toHaveBeenCalledWith(
      expect.objectContaining({ municipality_id: activeMunicipalityProfile.municipalityId })
    )
  })

  it("rejects end date before start date", async () => {
    vi.doMock("@/lib/auth/get-current-profile", () => ({
      getCurrentProfile: async () => activeMunicipalityProfile,
    }))
    vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => mockSupabaseClient() }))

    const { createPersonnelRequest } = await import("./actions")
    const result = await createPersonnelRequest({
      title: "Test",
      startDate: "2026-08-10",
      endDate: "2026-08-01",
    })

    expect(result.success).toBe(false)
  })

  it("refuses to update a request that's already reviewed", async () => {
    vi.doMock("@/lib/auth/get-current-profile", () => ({
      getCurrentProfile: async () => activeMunicipalityProfile,
    }))
    vi.doMock("@/lib/supabase/server", () => ({
      createClient: async () =>
        mockSupabaseClient({
          existing: { status: "reviewed", municipality_id: activeMunicipalityProfile.municipalityId },
        }),
    }))

    const { updatePersonnelRequest } = await import("./actions")
    const result = await updatePersonnelRequest(REQUEST_ID, { title: "Neu", startDate: "2026-08-01" })

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/bereits geprüft/)
  })

  it("treats an RLS-blocked update (zero rows affected) as a failure, not a silent success", async () => {
    vi.doMock("@/lib/auth/get-current-profile", () => ({
      getCurrentProfile: async () => activeMunicipalityProfile,
    }))
    vi.doMock("@/lib/supabase/server", () => ({
      createClient: async () => mockSupabaseClient({ updateResultLength: 0 }),
    }))

    const { updatePersonnelRequest } = await import("./actions")
    const result = await updatePersonnelRequest(REQUEST_ID, { title: "Neu", startDate: "2026-08-01" })

    expect(result.success).toBe(false)
  })

  it("withdraws (deletes) a request that's still 'created'", async () => {
    vi.doMock("@/lib/auth/get-current-profile", () => ({
      getCurrentProfile: async () => activeMunicipalityProfile,
    }))
    vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => mockSupabaseClient() }))

    const { withdrawPersonnelRequest } = await import("./actions")
    const result = await withdrawPersonnelRequest(REQUEST_ID)

    expect(result).toEqual({ success: true })
  })
})
