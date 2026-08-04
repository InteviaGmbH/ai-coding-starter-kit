import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

const partnerProfile = {
  id: "44444444-4444-4444-a444-444444444444",
  email: "firma@partner.ch",
  fullName: "Partner GmbH Nutzer",
  role: "partner_company" as const,
  accountStatus: "active" as const,
  municipalityId: null,
  candidateId: null,
  partnerCompanyId: "22222222-2222-4222-a222-222222222222",
}

const NEW_CANDIDATE_ID = "99999999-9999-4999-a999-999999999999"

function mockSupabaseClient(opts?: {
  insertError?: { message: string } | null
  updateError?: { message: string } | null
  updateMatchCount?: number
}) {
  const insertError = opts?.insertError ?? null
  const updateError = opts?.updateError ?? null
  const updateMatchCount = opts?.updateMatchCount ?? 1

  let lastInsertPayload: Record<string, unknown> | null = null

  const candidates = {
    insert: vi.fn((payload: Record<string, unknown>) => {
      lastInsertPayload = payload
      return {
        select: vi.fn(() => ({
          single: vi.fn(async () => ({
            data: insertError ? null : { id: NEW_CANDIDATE_ID },
            error: insertError,
          })),
        })),
      }
    }),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(async () => ({
          data: updateError ? null : new Array(updateMatchCount).fill({ id: NEW_CANDIDATE_ID }),
          error: updateError,
        })),
      })),
    })),
  }

  return {
    from: vi.fn((table: string) => {
      if (table === "candidates") return candidates
      throw new Error(`unexpected table: ${table}`)
    }),
    getLastInsertPayload: () => lastInsertPayload,
  }
}

async function importActions(client: ReturnType<typeof mockSupabaseClient>, profile = partnerProfile) {
  vi.doMock("@/lib/auth/get-current-profile", () => ({ getCurrentProfile: async () => profile }))
  vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => client }))
  return import("./actions")
}

describe("createPartnerCandidate", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it("rejects when the caller is not an active partner_company role", async () => {
    const { createPartnerCandidate } = await importActions(mockSupabaseClient(), {
      ...partnerProfile,
      role: "municipality",
    })

    const result = await createPartnerCandidate({ firstName: "Anna", lastName: "Muster" })
    expect(result).toEqual({ success: false, error: "Keine Berechtigung." })
  })

  it("rejects when the partner_company profile has no partner company link", async () => {
    const { createPartnerCandidate } = await importActions(mockSupabaseClient(), {
      ...partnerProfile,
      partnerCompanyId: null,
    })

    const result = await createPartnerCandidate({ firstName: "Anna", lastName: "Muster" })
    expect(result).toEqual({ success: false, error: "Keine Berechtigung." })
  })

  it("forces source_type=partner and the caller's own partner_company_id, ignoring anything else", async () => {
    const client = mockSupabaseClient()
    const { createPartnerCandidate } = await importActions(client)

    const result = await createPartnerCandidate({
      firstName: "Anna",
      lastName: "Muster",
      skills: "Pflege, Administration",
      region: "Zürich",
      availability: "ab sofort",
    })

    expect(result).toEqual({ success: true, id: NEW_CANDIDATE_ID })
    expect(client.getLastInsertPayload()).toMatchObject({
      source_type: "partner",
      partner_company_id: partnerProfile.partnerCompanyId,
      skills: ["Pflege", "Administration"],
    })
  })
})

describe("updatePartnerCandidate", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it("rejects when the caller is not an active partner_company role", async () => {
    const { updatePartnerCandidate } = await importActions(mockSupabaseClient(), {
      ...partnerProfile,
      role: "candidate",
    })

    const result = await updatePartnerCandidate(NEW_CANDIDATE_ID, { firstName: "Anna", lastName: "Muster" })
    expect(result).toEqual({ success: false, error: "Keine Berechtigung." })
  })

  it("reports a clean error when RLS silently blocks a cross-tenant update (0 rows affected)", async () => {
    const client = mockSupabaseClient({ updateMatchCount: 0 })
    const { updatePartnerCandidate } = await importActions(client)

    const result = await updatePartnerCandidate(NEW_CANDIDATE_ID, { firstName: "Anna", lastName: "Muster" })
    expect(result.success).toBe(false)
  })

  it("updates an own candidate on the happy path", async () => {
    const client = mockSupabaseClient()
    const { updatePartnerCandidate } = await importActions(client)

    const result = await updatePartnerCandidate(NEW_CANDIDATE_ID, { firstName: "Anna", lastName: "Muster" })
    expect(result).toEqual({ success: true, id: NEW_CANDIDATE_ID })
  })
})
