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

const REQUEST_ID = "55555555-5555-4555-a555-555555555555"
const CANDIDATE_ID = "66666666-6666-4666-a666-666666666666"
const OTHER_COMPANY_ID = "77777777-7777-4777-a777-777777777777"
const NEW_PROPOSAL_ID = "88888888-8888-4888-a888-888888888888"

function mockSupabaseClient(opts?: {
  requestVisible?: boolean
  candidatePartnerCompanyId?: string | null
  existingProposalCount?: number
  insertError?: { message: string } | null
}) {
  const requestVisible = opts?.requestVisible ?? true
  const candidatePartnerCompanyId =
    opts?.candidatePartnerCompanyId === undefined
      ? partnerProfile.partnerCompanyId
      : opts.candidatePartnerCompanyId
  const existingProposalCount = opts?.existingProposalCount ?? 0
  const insertError = opts?.insertError ?? null

  const personnelRequests = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(async () => ({
          data: { id: REQUEST_ID, visible_to_partners: requestVisible },
          error: null,
        })),
      })),
    })),
  }

  const candidates = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(async () => ({
          data: { id: CANDIDATE_ID, partner_company_id: candidatePartnerCompanyId },
          error: null,
        })),
      })),
    })),
  }

  const candidateProposals = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            limit: vi.fn(async () => ({
              data: new Array(existingProposalCount).fill({ id: "existing" }),
            })),
          })),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      select: vi.fn(async () => ({
        data: insertError ? null : [{ id: NEW_PROPOSAL_ID }],
        error: insertError,
      })),
    })),
  }

  const activityLog = { insert: vi.fn(async () => ({ error: null })) }

  return {
    from: vi.fn((table: string) => {
      if (table === "personnel_requests") return personnelRequests
      if (table === "candidates") return candidates
      if (table === "candidate_proposals") return candidateProposals
      if (table === "activity_log") return activityLog
      throw new Error(`unexpected table: ${table}`)
    }),
  }
}

async function importActions(client: ReturnType<typeof mockSupabaseClient>, profile = partnerProfile) {
  vi.doMock("@/lib/auth/get-current-profile", () => ({ getCurrentProfile: async () => profile }))
  vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => client }))
  return import("./actions")
}

describe("proposeCandidateAsPartner", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it("rejects when the caller is not an active partner_company role", async () => {
    const { proposeCandidateAsPartner } = await importActions(mockSupabaseClient(), {
      ...partnerProfile,
      role: "candidate",
    })

    const result = await proposeCandidateAsPartner(REQUEST_ID, CANDIDATE_ID)
    expect(result).toEqual({ success: false, error: "Keine Berechtigung." })
  })

  it("rejects proposing for a request that is not (or no longer) visible to partners", async () => {
    const client = mockSupabaseClient({ requestVisible: false })
    const { proposeCandidateAsPartner } = await importActions(client)

    const result = await proposeCandidateAsPartner(REQUEST_ID, CANDIDATE_ID)
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/nicht \(mehr\) für Partnerfirmen freigegeben/)
  })

  it("rejects proposing a candidate belonging to a different partner firm (impersonation attempt)", async () => {
    const client = mockSupabaseClient({ candidatePartnerCompanyId: OTHER_COMPANY_ID })
    const { proposeCandidateAsPartner } = await importActions(client)

    const result = await proposeCandidateAsPartner(REQUEST_ID, CANDIDATE_ID)
    expect(result.success).toBe(false)
    expect(result.error).toBe("Kandidat nicht gefunden.")
  })

  it("rejects a duplicate proposal that is still awaiting a decision", async () => {
    const client = mockSupabaseClient({ existingProposalCount: 1 })
    const { proposeCandidateAsPartner } = await importActions(client)

    const result = await proposeCandidateAsPartner(REQUEST_ID, CANDIDATE_ID)
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/bereits vorgeschlagen/)
  })

  it("creates a proposal and logs activity on the happy path", async () => {
    const client = mockSupabaseClient()
    const { proposeCandidateAsPartner } = await importActions(client)

    const result = await proposeCandidateAsPartner(REQUEST_ID, CANDIDATE_ID)
    expect(result).toEqual({ success: true })
    expect(client.from("candidate_proposals").insert).toHaveBeenCalledWith(
      expect.objectContaining({
        request_id: REQUEST_ID,
        candidate_id: CANDIDATE_ID,
        status: "proposed",
        proposed_by_id: partnerProfile.id,
      })
    )
    expect(client.from("activity_log").insert).toHaveBeenCalledWith(
      expect.objectContaining({ action: "proposed", entity_type: "candidate_proposal" })
    )
  })
})
