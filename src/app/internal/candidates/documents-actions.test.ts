import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

const CANDIDATE_ID = "33333333-3333-4333-a333-333333333333"
const DOCUMENT_ID = "55555555-5555-4555-a555-555555555555"

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
        select: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({
            data: archiveMatched ? { id: DOCUMENT_ID } : null,
            error: null,
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

describe("internal candidate documents server actions", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  describe("saveCandidateDocumentVersion", () => {
    it("rejects when the caller is not an active internal role", async () => {
      vi.doMock("@/lib/auth/get-current-profile", () => ({
        getCurrentProfile: async () => ({ ...activeAdminProfile, role: "candidate" }),
        INTERNAL_ROLES: ["super_admin", "dafinex_admin", "internal_coordinator"],
      }))
      vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => mockSupabaseClient() }))

      const { saveCandidateDocumentVersion } = await import("./documents-actions")
      const result = await saveCandidateDocumentVersion(CANDIDATE_ID, {
        documentType: "cv",
        name: "CV",
        filePath: `${CANDIDATE_ID}/cv.pdf`,
      })

      expect(result).toEqual({ success: false, error: "Keine Berechtigung." })
    })

    it("rejects an invalid candidate id", async () => {
      vi.doMock("@/lib/auth/get-current-profile", () => ({
        getCurrentProfile: async () => activeAdminProfile,
        INTERNAL_ROLES: ["super_admin", "dafinex_admin", "internal_coordinator"],
      }))
      vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => mockSupabaseClient() }))

      const { saveCandidateDocumentVersion } = await import("./documents-actions")
      const result = await saveCandidateDocumentVersion("not-a-uuid", {
        documentType: "cv",
        name: "CV",
        filePath: "x/cv.pdf",
      })

      expect(result).toEqual({ success: false, error: "Ungültige Anfrage." })
    })

    it("calls the atomic RPC with the given candidateId", async () => {
      vi.doMock("@/lib/auth/get-current-profile", () => ({
        getCurrentProfile: async () => activeAdminProfile,
        INTERNAL_ROLES: ["super_admin", "dafinex_admin", "internal_coordinator"],
      }))
      const client = mockSupabaseClient()
      vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => client }))

      const { saveCandidateDocumentVersion } = await import("./documents-actions")
      const result = await saveCandidateDocumentVersion(CANDIDATE_ID, {
        documentType: "work_permit",
        name: "Arbeitsbewilligung",
        filePath: `${CANDIDATE_ID}/permit.pdf`,
      })

      expect(result).toEqual({ success: true, documentId: DOCUMENT_ID })
      expect(client.rpc).toHaveBeenCalledWith("save_candidate_document_version", {
        p_candidate_id: CANDIDATE_ID,
        p_document_type: "work_permit",
        p_name: "Arbeitsbewilligung",
        p_file_path: `${CANDIDATE_ID}/permit.pdf`,
        p_expiry_date: null,
        p_document_id: null,
      })
    })
  })

  describe("archiveCandidateDocument", () => {
    it("rejects when the caller is not an active internal role", async () => {
      vi.doMock("@/lib/auth/get-current-profile", () => ({
        getCurrentProfile: async () => ({ ...activeAdminProfile, role: "municipality" }),
        INTERNAL_ROLES: ["super_admin", "dafinex_admin", "internal_coordinator"],
      }))
      vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => mockSupabaseClient() }))

      const { archiveCandidateDocument } = await import("./documents-actions")
      const result = await archiveCandidateDocument(CANDIDATE_ID, DOCUMENT_ID)

      expect(result).toEqual({ success: false, error: "Keine Berechtigung." })
    })

    it("archives a document", async () => {
      vi.doMock("@/lib/auth/get-current-profile", () => ({
        getCurrentProfile: async () => activeAdminProfile,
        INTERNAL_ROLES: ["super_admin", "dafinex_admin", "internal_coordinator"],
      }))
      vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => mockSupabaseClient() }))

      const { archiveCandidateDocument } = await import("./documents-actions")
      const result = await archiveCandidateDocument(CANDIDATE_ID, DOCUMENT_ID)

      expect(result).toEqual({ success: true })
    })
  })
})
