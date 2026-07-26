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

const ASSIGNMENT_ID = "88888888-8888-4888-a888-888888888888"
const CONTRACT_ID = "99999999-9999-4999-a999-999999999999"
const MUNICIPALITY_USER_ID = "22222222-2222-4222-a222-222222222222"

interface MockOpts {
  assignment?: {
    id: string
    status: string
    proposal: { request: { created_by_id: string | null; title: string } | null } | null
  } | null
  existingContract?: boolean
  insertError?: { message: string } | null
  contract?: { id: string; status: string; assignment_id: string } | null
  updateError?: { message: string } | null
}

function mockSupabaseClient(opts?: MockOpts) {
  const assignment =
    opts?.assignment === undefined
      ? {
          id: ASSIGNMENT_ID,
          status: "accepted",
          proposal: { request: { created_by_id: MUNICIPALITY_USER_ID, title: "Sozialarbeiter:in" } },
        }
      : opts.assignment
  const existingContract = opts?.existingContract ?? false
  const insertError = opts?.insertError ?? null
  const contract =
    opts?.contract === undefined
      ? { id: CONTRACT_ID, status: "generated", assignment_id: ASSIGNMENT_ID }
      : opts.contract
  const updateError = opts?.updateError ?? null

  const activityLogInsert = vi.fn(async () => ({ error: null }))
  const notificationsInsert = vi.fn(async () => ({ error: null }))

  const assignments = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({ single: vi.fn(async () => ({ data: assignment, error: null })) })),
    })),
  }

  const contracts = {
    select: vi.fn((cols: string) => {
      if (cols === "id") {
        return {
          eq: vi.fn(() => ({
            limit: vi.fn(async () => ({ data: existingContract ? [{ id: "existing" }] : [] })),
          })),
        }
      }
      return {
        eq: vi.fn(() => ({ single: vi.fn(async () => ({ data: contract, error: null })) })),
      }
    }),
    insert: vi.fn(() => ({
      select: vi.fn(async () => ({
        data: insertError ? null : [{ id: CONTRACT_ID }],
        error: insertError,
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(async () => ({
          data: updateError ? null : [{ id: CONTRACT_ID }],
          error: updateError,
        })),
      })),
    })),
  }

  return {
    from: vi.fn((table: string) => {
      if (table === "assignments") return assignments
      if (table === "contracts") return contracts
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

describe("createContract", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it("rejects when the caller is not an active internal role", async () => {
    const client = mockSupabaseClient()
    const { createContract } = await importActions(client, { ...activeAdminProfile, role: "municipality" })

    const result = await createContract(ASSIGNMENT_ID, "path/generated.pdf")
    expect(result).toEqual({ success: false, error: "Keine Berechtigung." })
  })

  it("rejects when the assignment status is still 'proposed'", async () => {
    const client = mockSupabaseClient({
      assignment: { id: ASSIGNMENT_ID, status: "proposed", proposal: null },
    })
    const { createContract } = await importActions(client)

    const result = await createContract(ASSIGNMENT_ID, "path/generated.pdf")
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/akzeptiert/)
  })

  it("rejects a duplicate contract for the same assignment", async () => {
    const client = mockSupabaseClient({ existingContract: true })
    const { createContract } = await importActions(client)

    const result = await createContract(ASSIGNMENT_ID, "path/generated.pdf")
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/bereits ein Vertrag/)
  })

  it("creates a contract, logs activity, and notifies the request creator", async () => {
    const client = mockSupabaseClient()
    const { createContract } = await importActions(client)

    const result = await createContract(ASSIGNMENT_ID, "path/generated.pdf")
    expect(result).toEqual({ success: true, id: CONTRACT_ID })
    expect(client.from("contracts").insert).toHaveBeenCalledWith(
      expect.objectContaining({ assignment_id: ASSIGNMENT_ID, status: "generated" }),
    )
    expect(client.from("activity_log").insert).toHaveBeenCalledWith(
      expect.objectContaining({ action: "generated", entity_type: "contract" }),
    )
    expect(client.from("notifications").insert).toHaveBeenCalledWith(
      expect.objectContaining({ recipient_id: MUNICIPALITY_USER_ID, type: "contract_ready" }),
    )
  })
})

describe("setSignedDocument", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it("rejects when the caller is not an active internal role", async () => {
    const client = mockSupabaseClient()
    const { setSignedDocument } = await importActions(client, { ...activeAdminProfile, role: "candidate" })

    const result = await setSignedDocument(CONTRACT_ID, "path/signed.pdf")
    expect(result).toEqual({ success: false, error: "Keine Berechtigung." })
  })

  it("sets the signed document and flips status to 'signed'", async () => {
    const client = mockSupabaseClient()
    const { setSignedDocument } = await importActions(client)

    const result = await setSignedDocument(CONTRACT_ID, "path/signed.pdf")
    expect(result).toEqual({ success: true })
    expect(client.from("contracts").update).toHaveBeenCalledWith({
      signed_document_path: "path/signed.pdf",
      status: "signed",
    })
  })

  it("rejects setting a signed document when one already exists", async () => {
    const client = mockSupabaseClient({
      contract: { id: CONTRACT_ID, status: "signed", assignment_id: ASSIGNMENT_ID },
    })
    const { setSignedDocument } = await importActions(client)

    const result = await setSignedDocument(CONTRACT_ID, "path/signed-2.pdf")
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/bereits eine unterschriebene/)
  })
})
