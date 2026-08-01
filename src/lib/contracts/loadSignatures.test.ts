import { describe, it, expect, vi, beforeEach } from "vitest"

const CONTRACT_ID = "99999999-9999-4999-a999-999999999999"

function mockSupabaseClient(opts: {
  signatures: Array<{
    party_type: string
    method: string
    signer_name: string | null
    signed_at: string
    file_path: string | null
    created_by: string | null
  }>
}) {
  const contract = {
    assignment: {
      proposal: {
        candidate: { first_name: "Anna", last_name: "Muster" },
      },
    },
  }

  return {
    from: vi.fn((table: string) => {
      if (table === "contract_signatures") {
        return { select: () => ({ eq: async () => ({ data: opts.signatures, error: null }) }) }
      }
      if (table === "contracts") {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: async () => ({ data: contract, error: null }) }),
          }),
        }
      }
      throw new Error(`unexpected table: ${table}`)
    }),
    storage: {
      from: () => ({
        createSignedUrl: async () => ({ data: { signedUrl: "https://example.com/signed" }, error: null }),
      }),
    },
  }
}

async function importLoader(client: unknown) {
  vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => client }))
  return import("./loadSignatures")
}

describe("loadContractSignatures", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it("attributes a candidate fallback upload to the candidate, not the uploading internal staff member", async () => {
    const client = mockSupabaseClient({
      signatures: [
        {
          party_type: "candidate",
          method: "upload",
          signer_name: null,
          signed_at: "2026-08-01T10:00:00Z",
          file_path: "assignment/candidate-signature.pdf",
          created_by: "Admin Muster",
        },
      ],
    })
    const { loadContractSignatures } = await importLoader(client)

    const result = await loadContractSignatures(CONTRACT_ID)
    const candidateRow = result.find((r) => r.partyType === "candidate")

    expect(candidateRow?.signerName).toBe("Anna Muster")
  })

  it("uses the typed signer name for a digital signature", async () => {
    const client = mockSupabaseClient({
      signatures: [
        {
          party_type: "dafinex",
          method: "digital",
          signer_name: "Max Muster",
          signed_at: "2026-08-01T10:00:00Z",
          file_path: null,
          created_by: "Max Muster",
        },
      ],
    })
    const { loadContractSignatures } = await importLoader(client)

    const result = await loadContractSignatures(CONTRACT_ID)
    const dafinexRow = result.find((r) => r.partyType === "dafinex")

    expect(dafinexRow?.signerName).toBe("Max Muster")
  })

  it("returns an open (unsigned) entry for a party without a row", async () => {
    const client = mockSupabaseClient({ signatures: [] })
    const { loadContractSignatures } = await importLoader(client)

    const result = await loadContractSignatures(CONTRACT_ID)

    expect(result).toHaveLength(3)
    expect(result.every((r) => r.signedAt === null)).toBe(true)
  })
})
