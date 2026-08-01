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
const CANDIDATE_USER_ID = "44444444-4444-4444-a444-444444444444"

interface MockOpts {
  assignment?: {
    id: string
    status: string
    proposal: { request: { created_by_id: string | null; title: string } | null } | null
  } | null
  existingContract?: boolean
  insertError?: { message: string } | null
  contract?: {
    id: string
    status: string
    assignment_id: string
    assignment?: {
      proposal: {
        request: { title: string; created_by_id: string | null } | null
        candidate?: { profile_id: string | null } | null
      } | null
    } | null
  } | null
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

// PROJ-15: signContractAsDafinex / uploadCandidateSignatureFallback replace
// the old setSignedDocument (whole-contract upload). These need a richer
// mock covering the signing-context lookup (contracts -> assignments ->
// candidate_proposals -> personnel_requests/candidates) plus the new
// contract_signatures table.

const SIGNING_CONTEXT_CONTRACT = {
  id: CONTRACT_ID,
  assignment_id: ASSIGNMENT_ID,
  assignment: {
    proposal: {
      request: { title: "Sozialarbeiter:in", created_by_id: MUNICIPALITY_USER_ID },
      candidate: { profile_id: CANDIDATE_USER_ID },
    },
  },
}

function mockSigningClient(opts?: {
  contract?: typeof SIGNING_CONTEXT_CONTRACT | null
  signatureInsertError?: { code?: string; message: string } | null
  wonCompletionClaim?: boolean
}) {
  const contract = opts?.contract === undefined ? SIGNING_CONTEXT_CONTRACT : opts.contract
  const signatureInsertError = opts?.signatureInsertError ?? null
  const wonCompletionClaim = opts?.wonCompletionClaim ?? false

  const signatureInsert = vi.fn(async () => ({ error: signatureInsertError }))
  const activityLogInsert = vi.fn(async () => ({ error: null }))
  const notificationsInsert = vi.fn(async () => ({ error: null }))
  const rpc = vi.fn(async () => ({ data: wonCompletionClaim, error: null }))

  const contracts = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({ maybeSingle: vi.fn(async () => ({ data: contract, error: null })) })),
    })),
  }

  const contractSignatures = {
    insert: signatureInsert,
  }

  const client = {
    from: vi.fn((table: string) => {
      if (table === "contracts") return contracts
      if (table === "contract_signatures") return contractSignatures
      if (table === "activity_log") return { insert: activityLogInsert }
      if (table === "notifications") return { insert: notificationsInsert }
      throw new Error(`unexpected table: ${table}`)
    }),
    rpc,
  }

  return { client, signatureInsert, activityLogInsert, notificationsInsert, rpc }
}

async function importSigningActions(client: unknown, profile: unknown = activeAdminProfile) {
  vi.doMock("@/lib/auth/get-current-profile", () => ({
    getCurrentProfile: async () => profile,
    INTERNAL_ROLES: ["super_admin", "dafinex_admin", "internal_coordinator"],
  }))
  vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => client }))
  vi.doMock("next/headers", () => ({
    headers: async () => new Map([["user-agent", "vitest"]]),
  }))
  vi.doMock("@/lib/notifications/get-active-internal-profile-ids", () => ({
    getActiveInternalProfileIds: async () => [],
  }))
  return import("./actions")
}

describe("signContractAsDafinex", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it("rejects when the caller is not an active internal role", async () => {
    const { client } = mockSigningClient()
    const { signContractAsDafinex } = await importSigningActions(client, {
      ...activeAdminProfile,
      role: "candidate",
    })

    const result = await signContractAsDafinex(CONTRACT_ID, { signerName: "Max Muster", agreed: true })
    expect(result).toEqual({ success: false, error: "Keine Berechtigung." })
  })

  it("rejects an empty signer name", async () => {
    const { client } = mockSigningClient()
    const { signContractAsDafinex } = await importSigningActions(client)

    const result = await signContractAsDafinex(CONTRACT_ID, { signerName: "   ", agreed: true })
    expect(result.success).toBe(false)
  })

  it("stores a digital signature with server-captured metadata", async () => {
    const { client, signatureInsert } = mockSigningClient()
    const { signContractAsDafinex } = await importSigningActions(client)

    const result = await signContractAsDafinex(CONTRACT_ID, { signerName: "Max Muster", agreed: true })
    expect(result).toEqual({ success: true })
    expect(signatureInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        contract_id: CONTRACT_ID,
        party_type: "dafinex",
        method: "digital",
        signer_name: "Max Muster",
        user_agent: "vitest",
      })
    )
  })

  it("returns a friendly error when this party already signed", async () => {
    const { client } = mockSigningClient({
      signatureInsertError: { code: "23505", message: "duplicate key" },
    })
    const { signContractAsDafinex } = await importSigningActions(client)

    const result = await signContractAsDafinex(CONTRACT_ID, { signerName: "Max Muster", agreed: true })
    expect(result).toEqual({ success: false, error: "Sie haben bereits unterschrieben." })
  })

  it("sends the completion notification when it wins the atomic completion claim", async () => {
    const { client, notificationsInsert, rpc } = mockSigningClient({ wonCompletionClaim: true })
    const { signContractAsDafinex } = await importSigningActions(client)

    await signContractAsDafinex(CONTRACT_ID, { signerName: "Max Muster", agreed: true })
    expect(rpc).toHaveBeenCalledWith("claim_contract_completion_notification", {
      p_contract_id: CONTRACT_ID,
    })
    expect(notificationsInsert).toHaveBeenCalledWith([
      expect.objectContaining({ recipient_id: MUNICIPALITY_USER_ID, type: "contract_signed" }),
      expect.objectContaining({ recipient_id: CANDIDATE_USER_ID, type: "contract_signed" }),
    ])
  })

  it("sends only the partial notification when it does not win the completion claim", async () => {
    const { client, notificationsInsert } = mockSigningClient({ wonCompletionClaim: false })
    const { signContractAsDafinex } = await importSigningActions(client)

    await signContractAsDafinex(CONTRACT_ID, { signerName: "Max Muster", agreed: true })
    expect(notificationsInsert).toHaveBeenCalledWith([
      expect.objectContaining({ recipient_id: MUNICIPALITY_USER_ID, type: "contract_party_signed" }),
      expect.objectContaining({ recipient_id: CANDIDATE_USER_ID, type: "contract_party_signed" }),
    ])
  })
})

describe("uploadCandidateSignatureFallback", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it("rejects when the caller is not an active internal role", async () => {
    const { client } = mockSigningClient()
    const { uploadCandidateSignatureFallback } = await importSigningActions(client, {
      ...activeAdminProfile,
      role: "municipality",
    })

    const result = await uploadCandidateSignatureFallback(CONTRACT_ID, `${ASSIGNMENT_ID}/signed.pdf`)
    expect(result).toEqual({ success: false, error: "Keine Berechtigung." })
  })

  it("stores the uploaded file as the candidate's signature", async () => {
    const { client, signatureInsert } = mockSigningClient()
    const { uploadCandidateSignatureFallback } = await importSigningActions(client)

    const result = await uploadCandidateSignatureFallback(CONTRACT_ID, `${ASSIGNMENT_ID}/signed.pdf`)
    expect(result).toEqual({ success: true })
    expect(signatureInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        contract_id: CONTRACT_ID,
        party_type: "candidate",
        method: "upload",
        file_path: `${ASSIGNMENT_ID}/signed.pdf`,
      })
    )
  })

  it("returns a friendly error when the candidate already has a signature on file", async () => {
    const { client } = mockSigningClient({
      signatureInsertError: { code: "23505", message: "duplicate key" },
    })
    const { uploadCandidateSignatureFallback } = await importSigningActions(client)

    const result = await uploadCandidateSignatureFallback(CONTRACT_ID, `${ASSIGNMENT_ID}/signed.pdf`)
    expect(result).toEqual({
      success: false,
      error: "Für diesen Kandidaten wurde bereits eine Unterschrift hinterlegt.",
    })
  })
})
