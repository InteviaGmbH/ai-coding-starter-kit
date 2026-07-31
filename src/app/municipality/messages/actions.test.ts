import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

const REQUEST_ID = "22222222-2222-4222-a222-222222222222"
const OWN_MUNICIPALITY_ID = "33333333-3333-4333-a333-333333333333"
const OTHER_MUNICIPALITY_ID = "99999999-9999-4999-a999-999999999999"

const activeMunicipalityProfile = {
  id: "44444444-4444-4444-a444-444444444444",
  email: "gemeinde@example.ch",
  fullName: "Gemeinde Muster",
  role: "municipality" as const,
  accountStatus: "active" as const,
  municipalityId: OWN_MUNICIPALITY_ID,
  candidateId: null,
}

function mockSupabaseClient(opts?: {
  requestMunicipalityId?: string | null
  insertError?: { message: string } | null
}) {
  const requestMunicipalityId = opts?.requestMunicipalityId ?? OWN_MUNICIPALITY_ID
  const insertError = opts?.insertError ?? null

  const messagesTable = {
    insert: vi.fn(() => Promise.resolve({ error: insertError })),
  }

  const personnelRequestsTable = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn(async () => ({
          data:
            requestMunicipalityId === null
              ? null
              : { id: REQUEST_ID, title: "Sozialarbeiter:in", municipality_id: requestMunicipalityId },
          error: null,
        })),
      })),
    })),
  }

  const client = {
    from: vi.fn((table: string) => {
      if (table === "messages") return messagesTable
      if (table === "personnel_requests") return personnelRequestsTable
      throw new Error(`unexpected table: ${table}`)
    }),
  }

  return { client, messagesTable }
}

describe("municipality message actions", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.doMock("@/lib/notifications/broadcast-new-message", () => ({
      broadcastNewMessageToInternal: vi.fn(),
    }))
  })

  describe("sendMunicipalityRequestMessage", () => {
    it("rejects when the caller is not an active municipality", async () => {
      vi.doMock("@/lib/auth/get-current-profile", () => ({
        getCurrentProfile: async () => ({ ...activeMunicipalityProfile, role: "candidate" }),
      }))
      const { client } = mockSupabaseClient()
      vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => client }))

      const { sendMunicipalityRequestMessage } = await import("./actions")
      const result = await sendMunicipalityRequestMessage(REQUEST_ID, { content: "Hallo" })

      expect(result).toEqual({ success: false, error: "Keine Berechtigung." })
    })

    it("rejects a request that does not belong to the caller's own municipality", async () => {
      vi.doMock("@/lib/auth/get-current-profile", () => ({
        getCurrentProfile: async () => activeMunicipalityProfile,
      }))
      const { client } = mockSupabaseClient({ requestMunicipalityId: OTHER_MUNICIPALITY_ID })
      vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => client }))

      const { sendMunicipalityRequestMessage } = await import("./actions")
      const result = await sendMunicipalityRequestMessage(REQUEST_ID, { content: "Hallo" })

      expect(result).toEqual({ success: false, error: "Anfrage nicht gefunden." })
    })

    it("sends a message on the caller's own request", async () => {
      vi.doMock("@/lib/auth/get-current-profile", () => ({
        getCurrentProfile: async () => activeMunicipalityProfile,
      }))
      const { client, messagesTable } = mockSupabaseClient()
      vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => client }))

      const { sendMunicipalityRequestMessage } = await import("./actions")
      const result = await sendMunicipalityRequestMessage(REQUEST_ID, {
        content: "Wann können wir mit einer Rückmeldung rechnen?",
      })

      expect(result).toEqual({ success: true })
      expect(messagesTable.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          message_type: "request",
          request_id: REQUEST_ID,
          created_by_id: activeMunicipalityProfile.id,
        })
      )
    })
  })

  describe("sendMunicipalityGeneralMessage", () => {
    it("rejects when the caller is not an active municipality", async () => {
      vi.doMock("@/lib/auth/get-current-profile", () => ({
        getCurrentProfile: async () => null,
      }))
      const { client } = mockSupabaseClient()
      vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => client }))

      const { sendMunicipalityGeneralMessage } = await import("./actions")
      const result = await sendMunicipalityGeneralMessage({ content: "Hallo" })

      expect(result).toEqual({ success: false, error: "Keine Berechtigung." })
    })

    it("sends a general message scoped to the caller's own municipality", async () => {
      vi.doMock("@/lib/auth/get-current-profile", () => ({
        getCurrentProfile: async () => activeMunicipalityProfile,
      }))
      const { client, messagesTable } = mockSupabaseClient()
      vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => client }))

      const { sendMunicipalityGeneralMessage } = await import("./actions")
      const result = await sendMunicipalityGeneralMessage({ content: "Frage vor der ersten Anfrage" })

      expect(result).toEqual({ success: true })
      expect(messagesTable.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          message_type: "general_municipality",
          municipality_id: OWN_MUNICIPALITY_ID,
        })
      )
    })
  })
})
