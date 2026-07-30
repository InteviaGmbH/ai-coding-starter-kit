import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

const CANDIDATE_ID = "33333333-3333-4333-a333-333333333333"
const DOCUMENT_ID = "55555555-5555-4555-a555-555555555555"

const activeCandidateProfile = {
  id: "11111111-1111-4111-a111-111111111111",
  email: "kandidat@example.com",
  fullName: "Test Kandidat",
  role: "candidate" as const,
  accountStatus: "active" as const,
  municipalityId: null,
  candidateId: CANDIDATE_ID,
}

function mockSupabaseClient(opts?: {
  rpcError?: { message: string } | null
  rpcData?: string | null
  archiveMatched?: boolean
}) {
  const rpcError = opts?.rpcError ?? null
  const rpcData = opts?.rpcData !== undefined ? opts.rpcData : DOCUMENT_ID
  const archiveMatched = opts?.archiveMatched ?? true

  const candidateDocuments = {
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({
              data: archiveMatched ? { id: DOCUMENT_ID } : null,
              error: null,
            })),
          })),
        })),
      })),
    })),
  }

  return {
    from: vi.fn((table: string) => {
      if (table === "candidate_documents") return candidateDocuments
      throw new Error(`unexpected table: ${table}`)
    }),
    rpc: vi.fn(async () => ({ data: rpcError ? null : rpcData, error: rpcError })),
  }
}

describe("candidate document self-service actions", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  describe("saveOwnCandidateDocumentVersion", () => {
    it("rejects when the caller is not an active candidate", async () => {
      vi.doMock("@/lib/auth/get-current-profile", () => ({
        getCurrentProfile: async () => ({ ...activeCandidateProfile, role: "municipality" }),
      }))
      vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => mockSupabaseClient() }))

      const { saveOwnCandidateDocumentVersion } = await import("./actions")
      const result = await saveOwnCandidateDocumentVersion({
        documentType: "cv",
        name: "CV",
        filePath: `${CANDIDATE_ID}/cv.pdf`,
      })

      expect(result).toEqual({ success: false, error: "Keine Berechtigung." })
    })

    it("rejects an expiry date in the past", async () => {
      vi.doMock("@/lib/auth/get-current-profile", () => ({
        getCurrentProfile: async () => activeCandidateProfile,
      }))
      vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => mockSupabaseClient() }))

      const { saveOwnCandidateDocumentVersion } = await import("./actions")
      const result = await saveOwnCandidateDocumentVersion({
        documentType: "work_permit",
        name: "Arbeitsbewilligung",
        filePath: `${CANDIDATE_ID}/permit.pdf`,
        expiryDate: "2020-01-01",
      })

      expect(result.success).toBe(false)
    })

    it("calls the atomic RPC with the caller's own candidateId, never a client-supplied one", async () => {
      vi.doMock("@/lib/auth/get-current-profile", () => ({
        getCurrentProfile: async () => activeCandidateProfile,
      }))
      const client = mockSupabaseClient()
      vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => client }))

      const { saveOwnCandidateDocumentVersion } = await import("./actions")
      const result = await saveOwnCandidateDocumentVersion({
        documentType: "certificate",
        name: "SVEB-Zertifikat",
        filePath: `${CANDIDATE_ID}/sveb.pdf`,
        expiryDate: "2027-01-01",
      })

      expect(result).toEqual({ success: true, documentId: DOCUMENT_ID })
      expect(client.rpc).toHaveBeenCalledWith("save_candidate_document_version", {
        p_candidate_id: CANDIDATE_ID,
        p_document_type: "certificate",
        p_name: "SVEB-Zertifikat",
        p_file_path: `${CANDIDATE_ID}/sveb.pdf`,
        p_expiry_date: "2027-01-01",
        p_document_id: null,
      })
    })

    it("reports failure when the RPC errors", async () => {
      vi.doMock("@/lib/auth/get-current-profile", () => ({
        getCurrentProfile: async () => activeCandidateProfile,
      }))
      vi.doMock("@/lib/supabase/server", () => ({
        createClient: async () => mockSupabaseClient({ rpcError: { message: "boom" } }),
      }))

      const { saveOwnCandidateDocumentVersion } = await import("./actions")
      const result = await saveOwnCandidateDocumentVersion({
        documentType: "cv",
        name: "CV",
        filePath: `${CANDIDATE_ID}/cv.pdf`,
      })

      expect(result.success).toBe(false)
    })
  })

  describe("archiveOwnCandidateDocument", () => {
    it("rejects an invalid document id", async () => {
      vi.doMock("@/lib/auth/get-current-profile", () => ({
        getCurrentProfile: async () => activeCandidateProfile,
      }))
      vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => mockSupabaseClient() }))

      const { archiveOwnCandidateDocument } = await import("./actions")
      const result = await archiveOwnCandidateDocument("not-a-uuid")

      expect(result).toEqual({ success: false, error: "Ungültige Anfrage." })
    })

    it("archives a document belonging to the caller", async () => {
      vi.doMock("@/lib/auth/get-current-profile", () => ({
        getCurrentProfile: async () => activeCandidateProfile,
      }))
      vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => mockSupabaseClient() }))

      const { archiveOwnCandidateDocument } = await import("./actions")
      const result = await archiveOwnCandidateDocument(DOCUMENT_ID)

      expect(result).toEqual({ success: true })
    })

    it("reports failure when the update matches zero rows (e.g. someone else's document)", async () => {
      vi.doMock("@/lib/auth/get-current-profile", () => ({
        getCurrentProfile: async () => activeCandidateProfile,
      }))
      vi.doMock("@/lib/supabase/server", () => ({
        createClient: async () => mockSupabaseClient({ archiveMatched: false }),
      }))

      const { archiveOwnCandidateDocument } = await import("./actions")
      const result = await archiveOwnCandidateDocument(DOCUMENT_ID)

      expect(result.success).toBe(false)
    })
  })
})
