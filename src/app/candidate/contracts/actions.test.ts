import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

const CONTRACT_ID = "99999999-9999-4999-a999-999999999999"
const ASSIGNMENT_ID = "88888888-8888-4888-a888-888888888888"
const CANDIDATE_USER_ID = "44444444-4444-4444-a444-444444444444"

const activeCandidateProfile = {
  id: CANDIDATE_USER_ID,
  email: "kandidat@example.ch",
  fullName: "Kandidat Muster",
  role: "candidate" as const,
  accountStatus: "active" as const,
  municipalityId: null,
  candidateId: "55555555-5555-4555-a555-555555555555",
}

function mockSupabaseClient() {
  const contract = {
    id: CONTRACT_ID,
    assignment_id: ASSIGNMENT_ID,
    assignment: {
      proposal: {
        request: { title: "Sozialarbeiter:in", created_by_id: null },
        candidate: { profile_id: CANDIDATE_USER_ID },
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

async function importActions(client: unknown, profile: unknown = activeCandidateProfile) {
  vi.doMock("@/lib/auth/get-current-profile", () => ({ getCurrentProfile: async () => profile }))
  vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => client }))
  vi.doMock("next/headers", () => ({ headers: async () => new Map() }))
  vi.doMock("@/lib/notifications/get-active-internal-profile-ids", () => ({
    getActiveInternalProfileIds: async () => [],
  }))
  return import("./actions")
}

describe("signContractAsCandidate", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it("rejects when the caller is not an active candidate", async () => {
    const { client } = mockSupabaseClient()
    const { signContractAsCandidate } = await importActions(client, {
      ...activeCandidateProfile,
      role: "municipality",
    })

    const result = await signContractAsCandidate(CONTRACT_ID, {
      signerName: "Kandidat Muster",
      agreed: true,
    })
    expect(result).toEqual({ success: false, error: "Keine Berechtigung." })
  })

  it("stores a digital signature for the candidate party", async () => {
    const { client, signatureInsert } = mockSupabaseClient()
    const { signContractAsCandidate } = await importActions(client)

    const result = await signContractAsCandidate(CONTRACT_ID, {
      signerName: "Kandidat Muster",
      agreed: true,
    })
    expect(result).toEqual({ success: true })
    expect(signatureInsert).toHaveBeenCalledWith(
      expect.objectContaining({ party_type: "candidate", method: "digital" })
    )
  })
})
