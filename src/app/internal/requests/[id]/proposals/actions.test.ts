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
const CANDIDATE_ID = "66666666-6666-4666-a666-666666666666"
const PROPOSAL_ID = "77777777-7777-4777-a777-777777777777"
const MUNICIPALITY_USER_ID = "22222222-2222-4222-a222-222222222222"

interface MockOpts {
  request?: { id: string; status: string; title?: string; created_by_id?: string | null } | null
  candidate?: { id: string; profile_id: string | null } | null
  candidateProfileStatus?: string
  existingOpenProposal?: boolean
  insertError?: { message: string } | null
  proposal?: { id: string; status: string; request_id: string } | null
  updateError?: { message: string } | null
  deleteError?: { message: string } | null
}

function mockSupabaseClient(opts?: MockOpts) {
  const request =
    opts?.request === undefined
      ? { id: REQUEST_ID, status: "reviewed", title: "Sozialarbeiter:in", created_by_id: MUNICIPALITY_USER_ID }
      : opts.request
  const candidate =
    opts?.candidate === undefined ? { id: CANDIDATE_ID, profile_id: null } : opts.candidate
  const candidateProfileStatus = opts?.candidateProfileStatus ?? "active"
  const existingOpenProposal = opts?.existingOpenProposal ?? false
  const insertError = opts?.insertError ?? null
  const proposal =
    opts?.proposal === undefined
      ? { id: PROPOSAL_ID, status: "proposed", request_id: REQUEST_ID }
      : opts.proposal
  const updateError = opts?.updateError ?? null
  const deleteError = opts?.deleteError ?? null

  const activityLogInsert = vi.fn(async () => ({ error: null }))
  const notificationsInsert = vi.fn(async () => ({ error: null }))

  const personnelRequests = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({ single: vi.fn(async () => ({ data: request, error: null })) })),
    })),
  }

  const candidates = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({ single: vi.fn(async () => ({ data: candidate, error: null })) })),
    })),
  }

  const profiles = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(async () => ({ data: { account_status: candidateProfileStatus }, error: null })),
      })),
    })),
  }

  const candidateProposalsSelectChain = {
    eq: vi.fn(function (this: unknown) {
      return this
    }),
    limit: vi.fn(async () => ({
      data: existingOpenProposal ? [{ id: "existing" }] : [],
    })),
    single: vi.fn(async () => ({ data: proposal, error: null })),
  }

  const candidateProposals = {
    select: vi.fn((cols: string) => {
      if (cols === "id") return candidateProposalsSelectChain
      return {
        eq: vi.fn(() => ({ single: vi.fn(async () => ({ data: proposal, error: null })) })),
      }
    }),
    insert: vi.fn(() => ({
      select: vi.fn(async () => ({
        data: insertError ? null : [{ id: PROPOSAL_ID }],
        error: insertError,
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(async () => ({
          data: updateError ? null : [{ id: PROPOSAL_ID }],
          error: updateError,
        })),
      })),
    })),
    delete: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(async () => ({
          data: deleteError ? null : [{ id: PROPOSAL_ID }],
          error: deleteError,
        })),
      })),
    })),
  }

  return {
    from: vi.fn((table: string) => {
      if (table === "personnel_requests") return personnelRequests
      if (table === "candidates") return candidates
      if (table === "profiles") return profiles
      if (table === "candidate_proposals") return candidateProposals
      if (table === "activity_log") return { insert: activityLogInsert }
      if (table === "notifications") return { insert: notificationsInsert }
      throw new Error(`unexpected table: ${table}`)
    }),
  }
}

async function importActions(client: ReturnType<typeof mockSupabaseClient>, profile = activeAdminProfile) {
  vi.doMock("@/lib/auth/get-current-profile", () => ({
    getCurrentProfile: async () => profile,
    INTERNAL_ROLES: ["super_admin", "dafinex_admin", "internal_coordinator"],
  }))
  vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => client }))
  return import("./actions")
}

describe("proposeCandidate", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it("rejects when the caller is not an active internal role", async () => {
    const client = mockSupabaseClient()
    const { proposeCandidate } = await importActions(client, {
      ...activeAdminProfile,
      role: "municipality",
    })

    const result = await proposeCandidate(REQUEST_ID, CANDIDATE_ID)
    expect(result).toEqual({ success: false, error: "Keine Berechtigung." })
  })

  it("rejects when the request is not yet reviewed", async () => {
    const client = mockSupabaseClient({ request: { id: REQUEST_ID, status: "created" } })
    const { proposeCandidate } = await importActions(client)

    const result = await proposeCandidate(REQUEST_ID, CANDIDATE_ID)
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/geprüft werden/)
  })

  it("rejects when the candidate's linked account is not active", async () => {
    const client = mockSupabaseClient({
      candidate: { id: CANDIDATE_ID, profile_id: "profile-1" },
      candidateProfileStatus: "pending",
    })
    const { proposeCandidate } = await importActions(client)

    const result = await proposeCandidate(REQUEST_ID, CANDIDATE_ID)
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/aktives Konto/)
  })

  it("rejects a duplicate proposal while one is still open", async () => {
    const client = mockSupabaseClient({ existingOpenProposal: true })
    const { proposeCandidate } = await importActions(client)

    const result = await proposeCandidate(REQUEST_ID, CANDIDATE_ID)
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/bereits vorgeschlagen/)
  })

  it("creates a proposal and logs activity when all checks pass", async () => {
    const client = mockSupabaseClient()
    const { proposeCandidate } = await importActions(client)

    const result = await proposeCandidate(REQUEST_ID, CANDIDATE_ID)
    expect(result).toEqual({ success: true })
    expect(client.from("candidate_proposals").insert).toHaveBeenCalledWith(
      expect.objectContaining({
        request_id: REQUEST_ID,
        candidate_id: CANDIDATE_ID,
        status: "proposed",
        proposed_by_id: activeAdminProfile.id,
      }),
    )
    expect(client.from("activity_log").insert).toHaveBeenCalledWith(
      expect.objectContaining({ action: "proposed", entity_type: "candidate_proposal" }),
    )
  })
})

describe("reviewProposal", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it("rejects when the caller is not an active internal role", async () => {
    const client = mockSupabaseClient()
    const { reviewProposal } = await importActions(client, {
      ...activeAdminProfile,
      role: "candidate",
    })

    const result = await reviewProposal(PROPOSAL_ID, "approved")
    expect(result).toEqual({ success: false, error: "Keine Berechtigung." })
  })

  it("approves an open proposal, logs activity, and notifies the request creator", async () => {
    const client = mockSupabaseClient()
    const { reviewProposal } = await importActions(client)

    const result = await reviewProposal(PROPOSAL_ID, "approved")
    expect(result).toEqual({ success: true })
    expect(client.from("candidate_proposals").update).toHaveBeenCalledWith({ status: "approved" })
    expect(client.from("activity_log").insert).toHaveBeenCalledWith(
      expect.objectContaining({ action: "approved" }),
    )
    expect(client.from("notifications").insert).toHaveBeenCalledWith(
      expect.objectContaining({ recipient_id: MUNICIPALITY_USER_ID, type: "proposal_approved" }),
    )
  })

  it("does not notify anyone when a proposal is rejected", async () => {
    const client = mockSupabaseClient()
    const { reviewProposal } = await importActions(client)

    await reviewProposal(PROPOSAL_ID, "rejected")
    expect(client.from("notifications").insert).not.toHaveBeenCalled()
  })

  it("rejects deciding on a proposal that was already decided", async () => {
    const client = mockSupabaseClient({
      proposal: { id: PROPOSAL_ID, status: "rejected", request_id: REQUEST_ID },
    })
    const { reviewProposal } = await importActions(client)

    const result = await reviewProposal(PROPOSAL_ID, "approved")
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/bereits entschieden/)
  })
})

describe("withdrawProposal", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it("withdraws an open proposal", async () => {
    const client = mockSupabaseClient()
    const { withdrawProposal } = await importActions(client)

    const result = await withdrawProposal(PROPOSAL_ID)
    expect(result).toEqual({ success: true })
    expect(client.from("candidate_proposals").delete).toHaveBeenCalled()
  })

  it("rejects withdrawing a proposal that was already decided", async () => {
    const client = mockSupabaseClient({
      proposal: { id: PROPOSAL_ID, status: "approved", request_id: REQUEST_ID },
    })
    const { withdrawProposal } = await importActions(client)

    const result = await withdrawProposal(PROPOSAL_ID)
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/Nur noch offene/)
  })
})
