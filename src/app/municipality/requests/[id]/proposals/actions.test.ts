import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

const activeMunicipalityProfile = {
  id: "22222222-2222-4222-a222-222222222222",
  email: "gemeinde@dafinex.ch",
  fullName: "Gemeinde Muster",
  role: "municipality" as const,
  accountStatus: "active" as const,
  municipalityId: "33333333-3333-4333-a333-333333333333",
  candidateId: null,
}

const OTHER_MUNICIPALITY_ID = "99999999-9999-4999-a999-999999999999"
const REQUEST_ID = "44444444-4444-4444-a444-444444444444"
const PROPOSAL_ID = "77777777-7777-4777-a777-777777777777"
const PROPOSER_ID = "11111111-1111-4111-a111-111111111111"

interface MockOpts {
  proposal?: { id: string; status: string; request_id: string; proposed_by_id: string | null } | null
  request?: { id: string; title: string; municipality_id: string } | null
  updateError?: { message: string } | null
}

function mockSupabaseClient(opts?: MockOpts) {
  const proposal =
    opts?.proposal === undefined
      ? { id: PROPOSAL_ID, status: "approved", request_id: REQUEST_ID, proposed_by_id: PROPOSER_ID }
      : opts.proposal
  const request =
    opts?.request === undefined
      ? { id: REQUEST_ID, title: "Sozialarbeiter:in", municipality_id: activeMunicipalityProfile.municipalityId }
      : opts.request
  const updateError = opts?.updateError ?? null

  const activityLogInsert = vi.fn(async () => ({ error: null }))
  const notificationsInsert = vi.fn(async () => ({ error: null }))

  const candidateProposals = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({ single: vi.fn(async () => ({ data: proposal, error: null })) })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(async () => ({
          data: updateError ? null : [{ id: PROPOSAL_ID }],
          error: updateError,
        })),
      })),
    })),
  }

  const personnelRequests = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({ single: vi.fn(async () => ({ data: request, error: null })) })),
    })),
  }

  return {
    from: vi.fn((table: string) => {
      if (table === "candidate_proposals") return candidateProposals
      if (table === "personnel_requests") return personnelRequests
      if (table === "activity_log") return { insert: activityLogInsert }
      if (table === "notifications") return { insert: notificationsInsert }
      throw new Error(`unexpected table: ${table}`)
    }),
  }
}

async function importActions(client: ReturnType<typeof mockSupabaseClient>, profile = activeMunicipalityProfile) {
  vi.doMock("@/lib/auth/get-current-profile", () => ({ getCurrentProfile: async () => profile }))
  vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => client }))
  return import("./actions")
}

describe("acceptProposal", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it("rejects when the caller is not an active municipality user", async () => {
    const client = mockSupabaseClient()
    const { acceptProposal } = await importActions(client, {
      ...activeMunicipalityProfile,
      role: "dafinex_admin",
    })

    const result = await acceptProposal(PROPOSAL_ID)
    expect(result).toEqual({ success: false, error: "Keine Berechtigung." })
  })

  it("rejects a proposal belonging to a different municipality's request", async () => {
    const client = mockSupabaseClient({
      request: { id: REQUEST_ID, title: "x", municipality_id: OTHER_MUNICIPALITY_ID },
    })
    const { acceptProposal } = await importActions(client)

    const result = await acceptProposal(PROPOSAL_ID)
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/nicht gefunden/)
  })

  it("rejects deciding on a proposal that isn't 'approved'", async () => {
    const client = mockSupabaseClient({
      proposal: {
        id: PROPOSAL_ID,
        status: "proposed",
        request_id: REQUEST_ID,
        proposed_by_id: PROPOSER_ID,
      },
    })
    const { acceptProposal } = await importActions(client)

    const result = await acceptProposal(PROPOSAL_ID)
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/bereits entschieden/)
  })

  it("accepts an approved proposal, logs activity, and notifies the proposer", async () => {
    const client = mockSupabaseClient()
    const { acceptProposal } = await importActions(client)

    const result = await acceptProposal(PROPOSAL_ID)
    expect(result).toEqual({ success: true })
    expect(client.from("candidate_proposals").update).toHaveBeenCalledWith({
      status: "municipality_accepted",
    })
    expect(client.from("activity_log").insert).toHaveBeenCalledWith(
      expect.objectContaining({ action: "municipality_accepted" }),
    )
    expect(client.from("notifications").insert).toHaveBeenCalledWith(
      expect.objectContaining({ recipient_id: PROPOSER_ID }),
    )
  })
})

describe("declineProposal", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it("declines an approved proposal and logs activity", async () => {
    const client = mockSupabaseClient()
    const { declineProposal } = await importActions(client)

    const result = await declineProposal(PROPOSAL_ID)
    expect(result).toEqual({ success: true })
    expect(client.from("candidate_proposals").update).toHaveBeenCalledWith({
      status: "municipality_declined",
    })
  })
})
