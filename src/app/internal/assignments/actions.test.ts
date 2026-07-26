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

const PROPOSAL_ID = "77777777-7777-4777-a777-777777777777"
const ASSIGNMENT_ID = "88888888-8888-4888-a888-888888888888"
const MUNICIPALITY_USER_ID = "22222222-2222-4222-a222-222222222222"

interface MockOpts {
  proposal?: { id: string; status: string } | null
  existingAssignment?: boolean
  insertError?: { message: string } | null
  assignment?: {
    id: string
    status: string
    proposal?: { request: { title: string; created_by_id: string | null } | null } | null
  } | null
  updateError?: { message: string } | null
}

function mockSupabaseClient(opts?: MockOpts) {
  const proposal =
    opts?.proposal === undefined ? { id: PROPOSAL_ID, status: "municipality_accepted" } : opts.proposal
  const existingAssignment = opts?.existingAssignment ?? false
  const insertError = opts?.insertError ?? null
  const assignment =
    opts?.assignment === undefined
      ? {
          id: ASSIGNMENT_ID,
          status: "proposed",
          proposal: { request: { title: "Sozialarbeiter:in", created_by_id: MUNICIPALITY_USER_ID } },
        }
      : opts.assignment
  const updateError = opts?.updateError ?? null

  const activityLogInsert = vi.fn(async () => ({ error: null }))
  const notificationsInsert = vi.fn(async () => ({ error: null }))

  const candidateProposals = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({ single: vi.fn(async () => ({ data: proposal, error: null })) })),
    })),
  }

  const assignments = {
    select: vi.fn((cols: string) => {
      if (cols === "id") {
        return {
          eq: vi.fn(() => ({
            limit: vi.fn(async () => ({ data: existingAssignment ? [{ id: "existing" }] : [] })),
          })),
        }
      }
      return {
        eq: vi.fn(() => ({ single: vi.fn(async () => ({ data: assignment, error: null })) })),
      }
    }),
    insert: vi.fn(() => ({
      select: vi.fn(async () => ({
        data: insertError ? null : [{ id: ASSIGNMENT_ID }],
        error: insertError,
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(async () => ({
          data: updateError ? null : [{ id: ASSIGNMENT_ID }],
          error: updateError,
        })),
      })),
    })),
  }

  return {
    from: vi.fn((table: string) => {
      if (table === "candidate_proposals") return candidateProposals
      if (table === "assignments") return assignments
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

describe("createAssignment", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it("rejects when the caller is not an active internal role", async () => {
    const client = mockSupabaseClient()
    const { createAssignment } = await importActions(client, { ...activeAdminProfile, role: "municipality" })

    const result = await createAssignment({ proposalId: PROPOSAL_ID, startDate: "2026-08-01" })
    expect(result).toEqual({ success: false, error: "Keine Berechtigung." })
  })

  it("rejects when the proposal isn't municipality_accepted", async () => {
    const client = mockSupabaseClient({ proposal: { id: PROPOSAL_ID, status: "approved" } })
    const { createAssignment } = await importActions(client)

    const result = await createAssignment({ proposalId: PROPOSAL_ID, startDate: "2026-08-01" })
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/angenommener Vorschlag/)
  })

  it("rejects a duplicate assignment for the same proposal", async () => {
    const client = mockSupabaseClient({ existingAssignment: true })
    const { createAssignment } = await importActions(client)

    const result = await createAssignment({ proposalId: PROPOSAL_ID, startDate: "2026-08-01" })
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/bereits ein Einsatz/)
  })

  it("rejects an end date before the start date", async () => {
    const client = mockSupabaseClient()
    const { createAssignment } = await importActions(client)

    const result = await createAssignment({
      proposalId: PROPOSAL_ID,
      startDate: "2026-08-10",
      endDate: "2026-08-01",
    })
    expect(result.success).toBe(false)
  })

  it("creates an assignment with status 'proposed' and logs activity", async () => {
    const client = mockSupabaseClient()
    const { createAssignment } = await importActions(client)

    const result = await createAssignment({ proposalId: PROPOSAL_ID, startDate: "2026-08-01" })
    expect(result).toEqual({ success: true, id: ASSIGNMENT_ID })
    expect(client.from("assignments").insert).toHaveBeenCalledWith(
      expect.objectContaining({ proposal_id: PROPOSAL_ID, status: "proposed" }),
    )
    expect(client.from("activity_log").insert).toHaveBeenCalledWith(
      expect.objectContaining({ action: "created", entity_type: "assignment" }),
    )
  })
})

describe("advanceAssignmentStatus", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it("rejects when the caller is not an active internal role", async () => {
    const client = mockSupabaseClient()
    const { advanceAssignmentStatus } = await importActions(client, {
      ...activeAdminProfile,
      role: "candidate",
    })

    const result = await advanceAssignmentStatus(ASSIGNMENT_ID)
    expect(result).toEqual({ success: false, error: "Keine Berechtigung." })
  })

  it("advances to the next status in order, logs activity, and notifies the request creator when becoming active", async () => {
    const client = mockSupabaseClient({
      assignment: {
        id: ASSIGNMENT_ID,
        status: "accepted",
        proposal: { request: { title: "Sozialarbeiter:in", created_by_id: MUNICIPALITY_USER_ID } },
      },
    })
    const { advanceAssignmentStatus } = await importActions(client)

    const result = await advanceAssignmentStatus(ASSIGNMENT_ID)
    expect(result).toEqual({ success: true })
    expect(client.from("assignments").update).toHaveBeenCalledWith({ status: "active" })
    expect(client.from("activity_log").insert).toHaveBeenCalledWith(
      expect.objectContaining({ action: "active" }),
    )
    expect(client.from("notifications").insert).toHaveBeenCalledWith(
      expect.objectContaining({ recipient_id: MUNICIPALITY_USER_ID, type: "assignment_active" }),
    )
  })

  it("does not notify anyone when advancing to a non-active status", async () => {
    const client = mockSupabaseClient({
      assignment: {
        id: ASSIGNMENT_ID,
        status: "proposed",
        proposal: { request: { title: "Sozialarbeiter:in", created_by_id: MUNICIPALITY_USER_ID } },
      },
    })
    const { advanceAssignmentStatus } = await importActions(client)

    await advanceAssignmentStatus(ASSIGNMENT_ID)
    expect(client.from("notifications").insert).not.toHaveBeenCalled()
  })

  it("rejects advancing a completed assignment", async () => {
    const client = mockSupabaseClient({ assignment: { id: ASSIGNMENT_ID, status: "completed" } })
    const { advanceAssignmentStatus } = await importActions(client)

    const result = await advanceAssignmentStatus(ASSIGNMENT_ID)
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/letzte Stufe/)
  })
})
