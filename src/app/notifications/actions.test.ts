import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

const activeProfile = {
  id: "11111111-1111-4111-a111-111111111111",
  email: "user@dafinex.ch",
  fullName: "User",
  role: "municipality" as const,
  accountStatus: "active" as const,
  municipalityId: "22222222-2222-4222-a222-222222222222",
  candidateId: null,
}

const NOTIFICATION_ID = "99999999-9999-4999-a999-999999999999"

function mockSupabaseClient(opts?: { updateResultLength?: number; error?: { message: string } | null }) {
  const updateResultLength = opts?.updateResultLength ?? 1
  const error = opts?.error ?? null

  // markNotificationRead: .update().eq().eq().select()
  const notifications = {
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(async () => ({
            data: error ? null : Array.from({ length: updateResultLength }, () => ({ id: NOTIFICATION_ID })),
            error,
          })),
        })),
      })),
    })),
  }

  return {
    from: vi.fn((table: string) => {
      if (table === "notifications") return notifications
      throw new Error(`unexpected table: ${table}`)
    }),
  }
}

async function importActions(client: ReturnType<typeof mockSupabaseClient>, profile: typeof activeProfile | null = activeProfile) {
  vi.doMock("@/lib/auth/get-current-profile", () => ({ getCurrentProfile: async () => profile }))
  vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => client }))
  return import("./actions")
}

describe("markNotificationRead", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it("rejects when not authenticated", async () => {
    const client = mockSupabaseClient()
    const { markNotificationRead } = await importActions(client, null)

    const result = await markNotificationRead(NOTIFICATION_ID)
    expect(result).toEqual({ success: false, error: "Keine Berechtigung." })
  })

  it("marks the caller's own notification as read", async () => {
    const client = mockSupabaseClient()
    const { markNotificationRead } = await importActions(client)

    const result = await markNotificationRead(NOTIFICATION_ID)
    expect(result).toEqual({ success: true })
    expect(client.from("notifications").update).toHaveBeenCalledWith({ is_read: true })
  })

  it("treats zero affected rows (RLS-blocked or foreign notification) as a failure", async () => {
    const client = mockSupabaseClient({ updateResultLength: 0 })
    const { markNotificationRead } = await importActions(client)

    const result = await markNotificationRead(NOTIFICATION_ID)
    expect(result.success).toBe(false)
  })
})

describe("markAllNotificationsRead", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it("rejects when not authenticated", async () => {
    const client = mockSupabaseClient()
    const { markAllNotificationsRead } = await importActions(client, null)

    const result = await markAllNotificationsRead()
    expect(result).toEqual({ success: false, error: "Keine Berechtigung." })
  })
})
