import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

const CANDIDATE_ID = "22222222-2222-4222-a222-222222222222"
const NOTE_ID = "55555555-5555-4555-a555-555555555555"

const activeAdminProfile = {
  id: "11111111-1111-4111-a111-111111111111",
  email: "admin@dafinex.ch",
  fullName: "Admin",
  role: "dafinex_admin" as const,
  accountStatus: "active" as const,
  municipalityId: null,
  candidateId: null,
}

function mockSupabaseClient(opts?: {
  insertError?: { message: string } | null
  deleteMatched?: boolean
}) {
  const insertError = opts?.insertError ?? null
  const deleteMatched = opts?.deleteMatched ?? true

  const internalNotesTable = {
    insert: vi.fn(() => Promise.resolve({ error: insertError })),
    delete: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({
              data: deleteMatched ? { id: NOTE_ID } : null,
              error: null,
            })),
          })),
        })),
      })),
    })),
  }

  const activityLogTable = {
    insert: vi.fn(() => Promise.resolve({ error: null })),
  }

  const client = {
    from: vi.fn((table: string) => {
      if (table === "internal_notes") return internalNotesTable
      if (table === "activity_log") return activityLogTable
      throw new Error(`unexpected table: ${table}`)
    }),
  }

  return { client, internalNotesTable, activityLogTable }
}

describe("internal notes server actions", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  describe("addInternalNote", () => {
    it("rejects when the caller is not an active internal role", async () => {
      vi.doMock("@/lib/auth/get-current-profile", () => ({
        getCurrentProfile: async () => ({ ...activeAdminProfile, role: "candidate" }),
        INTERNAL_ROLES: ["super_admin", "dafinex_admin", "internal_coordinator"],
      }))
      const { client } = mockSupabaseClient()
      vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => client }))

      const { addInternalNote } = await import("./actions")
      const result = await addInternalNote("candidate", CANDIDATE_ID, "Notiz")

      expect(result).toEqual({ success: false, error: "Keine Berechtigung." })
    })

    it("rejects empty content", async () => {
      vi.doMock("@/lib/auth/get-current-profile", () => ({
        getCurrentProfile: async () => activeAdminProfile,
        INTERNAL_ROLES: ["super_admin", "dafinex_admin", "internal_coordinator"],
      }))
      const { client } = mockSupabaseClient()
      vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => client }))

      const { addInternalNote } = await import("./actions")
      const result = await addInternalNote("candidate", CANDIDATE_ID, "   ")

      expect(result.success).toBe(false)
    })

    it("adds a note and logs the activity", async () => {
      vi.doMock("@/lib/auth/get-current-profile", () => ({
        getCurrentProfile: async () => activeAdminProfile,
        INTERNAL_ROLES: ["super_admin", "dafinex_admin", "internal_coordinator"],
      }))
      const { client, internalNotesTable, activityLogTable } = mockSupabaseClient()
      vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => client }))

      const { addInternalNote } = await import("./actions")
      const result = await addInternalNote("candidate", CANDIDATE_ID, "Bevorzugt Teilzeit")

      expect(result).toEqual({ success: true })
      expect(internalNotesTable.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          entity_type: "candidate",
          candidate_id: CANDIDATE_ID,
          content: "Bevorzugt Teilzeit",
          created_by_id: activeAdminProfile.id,
        })
      )
      expect(activityLogTable.insert).toHaveBeenCalledWith(
        expect.objectContaining({ entity_type: "candidate_note", action: "note_added" })
      )
    })
  })

  describe("deleteInternalNote", () => {
    it("rejects when the caller is not an active internal role", async () => {
      vi.doMock("@/lib/auth/get-current-profile", () => ({
        getCurrentProfile: async () => ({ ...activeAdminProfile, role: "municipality" }),
        INTERNAL_ROLES: ["super_admin", "dafinex_admin", "internal_coordinator"],
      }))
      const { client } = mockSupabaseClient()
      vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => client }))

      const { deleteInternalNote } = await import("./actions")
      const result = await deleteInternalNote("candidate", CANDIDATE_ID, NOTE_ID)

      expect(result).toEqual({ success: false, error: "Keine Berechtigung." })
    })

    it("returns an error when the note does not match the given entity", async () => {
      vi.doMock("@/lib/auth/get-current-profile", () => ({
        getCurrentProfile: async () => activeAdminProfile,
        INTERNAL_ROLES: ["super_admin", "dafinex_admin", "internal_coordinator"],
      }))
      const { client } = mockSupabaseClient({ deleteMatched: false })
      vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => client }))

      const { deleteInternalNote } = await import("./actions")
      const result = await deleteInternalNote("candidate", CANDIDATE_ID, NOTE_ID)

      expect(result).toEqual({ success: false, error: "Notiz konnte nicht gelöscht werden." })
    })

    it("deletes a note and logs the activity", async () => {
      vi.doMock("@/lib/auth/get-current-profile", () => ({
        getCurrentProfile: async () => activeAdminProfile,
        INTERNAL_ROLES: ["super_admin", "dafinex_admin", "internal_coordinator"],
      }))
      const { client, internalNotesTable, activityLogTable } = mockSupabaseClient()
      vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => client }))

      const { deleteInternalNote } = await import("./actions")
      const result = await deleteInternalNote("candidate", CANDIDATE_ID, NOTE_ID)

      expect(result).toEqual({ success: true })
      expect(internalNotesTable.delete).toHaveBeenCalled()
      expect(activityLogTable.insert).toHaveBeenCalledWith(
        expect.objectContaining({ entity_type: "candidate_note", action: "note_deleted" })
      )
    })
  })
})
