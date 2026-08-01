import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

const CONTRACT_ID = "99999999-9999-4999-a999-999999999999"
const ASSIGNMENT_ID = "88888888-8888-4888-a888-888888888888"
const MUNICIPALITY_USER_ID = "22222222-2222-4222-a222-222222222222"

const activeMunicipalityProfile = {
  id: MUNICIPALITY_USER_ID,
  email: "gemeinde@example.ch",
  fullName: "Gemeinde Muster",
  role: "municipality" as const,
  accountStatus: "active" as const,
  municipalityId: "33333333-3333-4333-a333-333333333333",
  candidateId: null,
}

function mockSupabaseClient() {
  const contract = {
    id: CONTRACT_ID,
    assignment_id: ASSIGNMENT_ID,
    assignment: {
      proposal: {
        request: { title: "Sozialarbeiter:in", created_by_id: MUNICIPALITY_USER_ID },
        candidate: { profile_id: null },
      },
    },
  }

  const signatureInsert = vi.fn(async () => ({ error: null }))
  const activityLogInsert = vi.fn(async () => ({ error: null }))
  const notificationsInsert = vi.fn(async () => ({ error: null }))

  const client = {
    from: vi.fn((table: string) => {
      if (table === "contracts") {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: async () => ({ data: contract, error: null }) }),
          }),
        }
      }
      if (table === "contract_signatures") {
        return {
          insert: signatureInsert,
          select: () => ({ eq: async () => ({ count: 1, error: null }) }),
        }
      }
      if (table === "activity_log") return { insert: activityLogInsert }
      if (table === "notifications") return { insert: notificationsInsert }
      throw new Error(`unexpected table: ${table}`)
    }),
  }

  return { client, signatureInsert }
}

async function importActions(client: unknown, profile: unknown = activeMunicipalityProfile) {
  vi.doMock("@/lib/auth/get-current-profile", () => ({ getCurrentProfile: async () => profile }))
  vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => client }))
  vi.doMock("next/headers", () => ({ headers: async () => new Map() }))
  vi.doMock("@/lib/notifications/get-active-internal-profile-ids", () => ({
    getActiveInternalProfileIds: async () => [],
  }))
  return import("./actions")
}

describe("signContractAsMunicipality", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it("rejects when the caller is not an active municipality", async () => {
    const { client } = mockSupabaseClient()
    const { signContractAsMunicipality } = await importActions(client, {
      ...activeMunicipalityProfile,
      role: "candidate",
    })

    const result = await signContractAsMunicipality(CONTRACT_ID, {
      signerName: "Gemeinde Muster",
      agreed: true,
    })
    expect(result).toEqual({ success: false, error: "Keine Berechtigung." })
  })

  it("stores a digital signature for the municipality party", async () => {
    const { client, signatureInsert } = mockSupabaseClient()
    const { signContractAsMunicipality } = await importActions(client)

    const result = await signContractAsMunicipality(CONTRACT_ID, {
      signerName: "Gemeinde Muster",
      agreed: true,
    })
    expect(result).toEqual({ success: true })
    expect(signatureInsert).toHaveBeenCalledWith(
      expect.objectContaining({ party_type: "municipality", method: "digital" })
    )
  })
})
