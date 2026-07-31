import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

const ASSIGNMENT_ID = "22222222-2222-4222-a222-222222222222"
const OWN_CANDIDATE_ID = "33333333-3333-4333-a333-333333333333"
const OTHER_CANDIDATE_ID = "99999999-9999-4999-a999-999999999999"

const activeCandidateProfile = {
  id: "44444444-4444-4444-a444-444444444444",
  email: "kandidat@example.ch",
  fullName: "Kandidat Muster",
  role: "candidate" as const,
  accountStatus: "active" as const,
  municipalityId: null,
  candidateId: OWN_CANDIDATE_ID,
}

function mockSupabaseClient(opts?: {
  assignmentCandidateId?: string | null
  insertError?: { message: string } | null
}) {
  const assignmentCandidateId =
    opts?.assignmentCandidateId === undefined ? OWN_CANDIDATE_ID : opts.assignmentCandidateId
  const insertError = opts?.insertError ?? null

  const messagesTable = {
    insert: vi.fn(() => Promise.resolve({ error: insertError })),
  }

  const assignmentsTable = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn(async () => ({
          data:
            assignmentCandidateId === null
              ? null
              : { id: ASSIGNMENT_ID, proposal: { candidate_id: assignmentCandidateId } },
          error: null,
        })),
      })),
    })),
  }

  const client = {
    from: vi.fn((table: string) => {
      if (table === "messages") return messagesTable
      if (table === "assignments") return assignmentsTable
      throw new Error(`unexpected table: ${table}`)
    }),
  }

  return { client, messagesTable }
}

describe("candidate message actions", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.doMock("@/lib/notifications/broadcast-new-message", () => ({
      broadcastNewMessageToInternal: vi.fn(),
    }))
  })

  describe("sendCandidateAssignmentMessage", () => {
    it("rejects when the caller is not an active candidate", async () => {
      vi.doMock("@/lib/auth/get-current-profile", () => ({
        getCurrentProfile: async () => ({ ...activeCandidateProfile, role: "municipality" }),
      }))
      const { client } = mockSupabaseClient()
      vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => client }))

      const { sendCandidateAssignmentMessage } = await import("./actions")
      const result = await sendCandidateAssignmentMessage(ASSIGNMENT_ID, { content: "Hallo" })

      expect(result).toEqual({ success: false, error: "Keine Berechtigung." })
    })

    it("rejects an assignment that does not belong to the caller's own candidate", async () => {
      vi.doMock("@/lib/auth/get-current-profile", () => ({
        getCurrentProfile: async () => activeCandidateProfile,
      }))
      const { client } = mockSupabaseClient({ assignmentCandidateId: OTHER_CANDIDATE_ID })
      vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => client }))

      const { sendCandidateAssignmentMessage } = await import("./actions")
      const result = await sendCandidateAssignmentMessage(ASSIGNMENT_ID, { content: "Hallo" })

      expect(result).toEqual({ success: false, error: "Einsatz nicht gefunden." })
    })

    it("sends a message on the caller's own assignment", async () => {
      vi.doMock("@/lib/auth/get-current-profile", () => ({
        getCurrentProfile: async () => activeCandidateProfile,
      }))
      const { client, messagesTable } = mockSupabaseClient()
      vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => client }))

      const { sendCandidateAssignmentMessage } = await import("./actions")
      const result = await sendCandidateAssignmentMessage(ASSIGNMENT_ID, {
        content: "Wann beginnt der Einsatz genau?",
      })

      expect(result).toEqual({ success: true })
      expect(messagesTable.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          message_type: "assignment",
          assignment_id: ASSIGNMENT_ID,
          created_by_id: activeCandidateProfile.id,
        })
      )
    })
  })

  describe("sendCandidateGeneralMessage", () => {
    it("sends a general message scoped to the caller's own candidate", async () => {
      vi.doMock("@/lib/auth/get-current-profile", () => ({
        getCurrentProfile: async () => activeCandidateProfile,
      }))
      const { client, messagesTable } = mockSupabaseClient()
      vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => client }))

      const { sendCandidateGeneralMessage } = await import("./actions")
      const result = await sendCandidateGeneralMessage({ content: "Frage vor dem ersten Einsatz" })

      expect(result).toEqual({ success: true })
      expect(messagesTable.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          message_type: "general_candidate",
          candidate_id: OWN_CANDIDATE_ID,
        })
      )
    })
  })
})
