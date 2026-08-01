import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

const activeProfile = {
  id: "11111111-1111-4111-a111-111111111111",
  email: "gemeinde@example.ch",
  fullName: "Gemeinde Muster",
  role: "municipality" as const,
  accountStatus: "active" as const,
  municipalityId: "22222222-2222-4222-a222-222222222222",
  candidateId: null,
  hiddenDashboardWidgets: [],
}

function mockSupabaseClient(opts?: { updateError?: { message: string } | null }) {
  const updateError = opts?.updateError ?? null
  const eqMock = vi.fn(async () => ({ error: updateError }))
  const updateMock = vi.fn(() => ({ eq: eqMock }))

  return {
    client: {
      from: vi.fn((table: string) => {
        if (table === "profiles") return { update: updateMock }
        throw new Error(`unexpected table: ${table}`)
      }),
    },
    updateMock,
    eqMock,
  }
}

async function importActions(client: unknown, profile: unknown = activeProfile) {
  vi.doMock("@/lib/auth/get-current-profile", () => ({ getCurrentProfile: async () => profile }))
  vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => client }))
  return import("./actions")
}

describe("updateHiddenDashboardWidgets", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it("rejects when the caller is not authenticated", async () => {
    const { client } = mockSupabaseClient()
    const { updateHiddenDashboardWidgets } = await importActions(client, null)

    const result = await updateHiddenDashboardWidgets(["stats"])
    expect(result).toEqual({ success: false, error: "Keine Berechtigung." })
  })

  it("saves the hidden widget list for the caller's own profile", async () => {
    const { client, updateMock, eqMock } = mockSupabaseClient()
    const { updateHiddenDashboardWidgets } = await importActions(client)

    const result = await updateHiddenDashboardWidgets(["stats", "chart"])
    expect(result).toEqual({ success: true })
    expect(updateMock).toHaveBeenCalledWith({ hidden_dashboard_widgets: ["stats", "chart"] })
    expect(eqMock).toHaveBeenCalledWith("id", activeProfile.id)
  })

  it("returns an error when the update fails", async () => {
    const { client } = mockSupabaseClient({ updateError: { message: "db error" } })
    const { updateHiddenDashboardWidgets } = await importActions(client)

    const result = await updateHiddenDashboardWidgets(["stats"])
    expect(result).toEqual({ success: false, error: "Einstellung konnte nicht gespeichert werden." })
  })
})
