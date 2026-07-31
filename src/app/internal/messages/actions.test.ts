import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

const REQUEST_ID = "22222222-2222-4222-a222-222222222222"
const MUNICIPALITY_USER_ID = "44444444-4444-4444-a444-444444444444"

const activeAdminProfile = {
  id: "11111111-1111-4111-a111-111111111111",
  email: "admin@dafinex.ch",
  fullName: "Admin",
  role: "dafinex_admin" as const,
  accountStatus: "active" as const,
  municipalityId: null,
  candidateId: null,
}

function mockSupabaseClient(opts?: { insertError?: { message: string } | null }) {
  const insertError = opts?.insertError ?? null
  const insertedRows: Array<{ table: string; payload: unknown }> = []

  const messagesTable = {
    insert: vi.fn((payload: unknown) => {
      insertedRows.push({ table: "messages", payload })
      return Promise.resolve({ error: insertError })
    }),
  }

  const personnelRequestsTable = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(async () => ({
          data: { created_by_id: MUNICIPALITY_USER_ID, title: "Sozialarbeiter:in" },
          error: null,
        })),
      })),
    })),
  }

  const notificationsTable = {
    insert: vi.fn((payload: unknown) => {
      insertedRows.push({ table: "notifications", payload })
      return Promise.resolve({ error: null })
    }),
  }

  const client = {
    from: vi.fn((table: string) => {
      if (table === "messages") return messagesTable
      if (table === "personnel_requests") return personnelRequestsTable
      if (table === "notifications") return notificationsTable
      throw new Error(`unexpected table: ${table}`)
    }),
  }

  return { client, insertedRows, messagesTable, notificationsTable }
}

describe("sendInternalMessage", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it("rejects when the caller is not an active internal role", async () => {
    vi.doMock("@/lib/auth/get-current-profile", () => ({
      getCurrentProfile: async () => ({ ...activeAdminProfile, role: "municipality" }),
      INTERNAL_ROLES: ["super_admin", "dafinex_admin", "internal_coordinator"],
    }))
    const { client } = mockSupabaseClient()
    vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => client }))

    const { sendInternalMessage } = await import("./actions")
    const result = await sendInternalMessage(
      { messageType: "request", requestId: REQUEST_ID },
      { content: "Hallo" }
    )

    expect(result).toEqual({ success: false, error: "Keine Berechtigung." })
  })

  it("rejects empty content", async () => {
    vi.doMock("@/lib/auth/get-current-profile", () => ({
      getCurrentProfile: async () => activeAdminProfile,
      INTERNAL_ROLES: ["super_admin", "dafinex_admin", "internal_coordinator"],
    }))
    const { client } = mockSupabaseClient()
    vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => client }))

    const { sendInternalMessage } = await import("./actions")
    const result = await sendInternalMessage(
      { messageType: "request", requestId: REQUEST_ID },
      { content: "   " }
    )

    expect(result.success).toBe(false)
  })

  it("sends a message on a request thread and notifies the request's creator", async () => {
    vi.doMock("@/lib/auth/get-current-profile", () => ({
      getCurrentProfile: async () => activeAdminProfile,
      INTERNAL_ROLES: ["super_admin", "dafinex_admin", "internal_coordinator"],
    }))
    const { client, messagesTable, notificationsTable } = mockSupabaseClient()
    vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => client }))

    const { sendInternalMessage } = await import("./actions")
    const result = await sendInternalMessage(
      { messageType: "request", requestId: REQUEST_ID },
      { content: "Vielen Dank für Ihre Anfrage." }
    )

    expect(result).toEqual({ success: true })
    expect(messagesTable.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        message_type: "request",
        request_id: REQUEST_ID,
        content: "Vielen Dank für Ihre Anfrage.",
        created_by_id: activeAdminProfile.id,
      })
    )
    expect(notificationsTable.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        recipient_id: MUNICIPALITY_USER_ID,
        type: "new_message",
      })
    )
  })

  it("returns an error when the insert fails", async () => {
    vi.doMock("@/lib/auth/get-current-profile", () => ({
      getCurrentProfile: async () => activeAdminProfile,
      INTERNAL_ROLES: ["super_admin", "dafinex_admin", "internal_coordinator"],
    }))
    const { client } = mockSupabaseClient({ insertError: { message: "db error" } })
    vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => client }))

    const { sendInternalMessage } = await import("./actions")
    const result = await sendInternalMessage(
      { messageType: "request", requestId: REQUEST_ID },
      { content: "Hallo" }
    )

    expect(result).toEqual({ success: false, error: "Nachricht konnte nicht gesendet werden." })
  })
})
