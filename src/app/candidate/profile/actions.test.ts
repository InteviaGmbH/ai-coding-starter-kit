import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

const CANDIDATE_ID = "33333333-3333-4333-a333-333333333333"
const PROFILE_ID = "11111111-1111-4111-a111-111111111111"

const activeCandidateProfile = {
  id: PROFILE_ID,
  email: "kandidat@example.com",
  fullName: "Alte Vorname Nachname",
  role: "candidate" as const,
  accountStatus: "active" as const,
  municipalityId: null,
  candidateId: CANDIDATE_ID,
}

function mockSupabaseClient(opts?: {
  candidatesUpdateError?: { message: string } | null
  candidatesUpdateMatchedZeroRows?: boolean
  profilesUpdateError?: { message: string } | null
}) {
  const candidatesUpdateError = opts?.candidatesUpdateError ?? null
  const matchedZeroRows = opts?.candidatesUpdateMatchedZeroRows ?? false
  const profilesUpdateError = opts?.profilesUpdateError ?? null

  const candidates = {
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({
            data: candidatesUpdateError || matchedZeroRows ? null : { id: CANDIDATE_ID },
            error: candidatesUpdateError,
          })),
        })),
      })),
    })),
  }

  const profiles = {
    update: vi.fn(() => ({ eq: vi.fn(async () => ({ error: profilesUpdateError })) })),
  }

  return {
    from: vi.fn((table: string) => {
      if (table === "candidates") return candidates
      if (table === "profiles") return profiles
      throw new Error(`unexpected table: ${table}`)
    }),
  }
}

describe("candidate profile self-service actions", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  describe("updateCandidateContact", () => {
    it("rejects when the caller is not an active candidate", async () => {
      vi.doMock("@/lib/auth/get-current-profile", () => ({
        getCurrentProfile: async () => ({ ...activeCandidateProfile, role: "municipality" }),
      }))
      vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => mockSupabaseClient() }))

      const { updateCandidateContact } = await import("./actions")
      const result = await updateCandidateContact({ firstName: "Max", lastName: "Muster" })

      expect(result).toEqual({ success: false, error: "Keine Berechtigung." })
    })

    it("rejects when the caller has no linked candidate row", async () => {
      vi.doMock("@/lib/auth/get-current-profile", () => ({
        getCurrentProfile: async () => ({ ...activeCandidateProfile, candidateId: null }),
      }))
      vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => mockSupabaseClient() }))

      const { updateCandidateContact } = await import("./actions")
      const result = await updateCandidateContact({ firstName: "Max", lastName: "Muster" })

      expect(result).toEqual({ success: false, error: "Keine Berechtigung." })
    })

    it("rejects an empty last name", async () => {
      vi.doMock("@/lib/auth/get-current-profile", () => ({
        getCurrentProfile: async () => activeCandidateProfile,
      }))
      vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => mockSupabaseClient() }))

      const { updateCandidateContact } = await import("./actions")
      const result = await updateCandidateContact({ firstName: "Max", lastName: "" })

      expect(result.success).toBe(false)
    })

    it("updates both the candidate row and profiles.full_name on the happy path", async () => {
      vi.doMock("@/lib/auth/get-current-profile", () => ({
        getCurrentProfile: async () => activeCandidateProfile,
      }))
      const client = mockSupabaseClient()
      vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => client }))

      const { updateCandidateContact } = await import("./actions")
      const result = await updateCandidateContact({
        firstName: "Max",
        lastName: "Muster",
        phone: "079 123 45 67",
      })

      expect(result).toEqual({ success: true })
      expect(client.from("candidates").update).toHaveBeenCalledWith(
        expect.objectContaining({ first_name: "Max", last_name: "Muster", phone: "079 123 45 67" })
      )
      expect(client.from("profiles").update).toHaveBeenCalledWith({ full_name: "Max Muster" })
    })
  })

  describe("updateCandidateAvailability", () => {
    it("rejects a workload percentage above 100", async () => {
      vi.doMock("@/lib/auth/get-current-profile", () => ({
        getCurrentProfile: async () => activeCandidateProfile,
      }))
      vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => mockSupabaseClient() }))

      const { updateCandidateAvailability } = await import("./actions")
      const result = await updateCandidateAvailability({ maxWorkloadPercent: "120" })

      expect(result.success).toBe(false)
    })

    it("rejects an end date before the start date", async () => {
      vi.doMock("@/lib/auth/get-current-profile", () => ({
        getCurrentProfile: async () => activeCandidateProfile,
      }))
      vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => mockSupabaseClient() }))

      const { updateCandidateAvailability } = await import("./actions")
      const result = await updateCandidateAvailability({
        availabilityStart: "2026-09-01",
        availabilityEnd: "2026-08-01",
      })

      expect(result.success).toBe(false)
    })

    it("saves valid availability values", async () => {
      vi.doMock("@/lib/auth/get-current-profile", () => ({
        getCurrentProfile: async () => activeCandidateProfile,
      }))
      const client = mockSupabaseClient()
      vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => client }))

      const { updateCandidateAvailability } = await import("./actions")
      const result = await updateCandidateAvailability({
        maxWorkloadPercent: "80",
        availabilityStart: "2026-09-01",
        availabilityEnd: "",
      })

      expect(result).toEqual({ success: true })
      expect(client.from("candidates").update).toHaveBeenCalledWith(
        expect.objectContaining({
          max_workload_percent: 80,
          availability_start: "2026-09-01",
          availability_end: null,
        })
      )
    })

    it("saves an empty workload field as null, not 0", async () => {
      vi.doMock("@/lib/auth/get-current-profile", () => ({
        getCurrentProfile: async () => activeCandidateProfile,
      }))
      const client = mockSupabaseClient()
      vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => client }))

      const { updateCandidateAvailability } = await import("./actions")
      const result = await updateCandidateAvailability({ maxWorkloadPercent: "" })

      expect(result).toEqual({ success: true })
      expect(client.from("candidates").update).toHaveBeenCalledWith(
        expect.objectContaining({ max_workload_percent: null })
      )
    })
  })

  describe("updateCandidateQualifications", () => {
    it("rejects negative experience years", async () => {
      vi.doMock("@/lib/auth/get-current-profile", () => ({
        getCurrentProfile: async () => activeCandidateProfile,
      }))
      vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => mockSupabaseClient() }))

      const { updateCandidateQualifications } = await import("./actions")
      const result = await updateCandidateQualifications({ experienceYears: "-1" })

      expect(result.success).toBe(false)
    })

    it("converts comma-separated fields into arrays on the happy path", async () => {
      vi.doMock("@/lib/auth/get-current-profile", () => ({
        getCurrentProfile: async () => activeCandidateProfile,
      }))
      const client = mockSupabaseClient()
      vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => client }))

      const { updateCandidateQualifications } = await import("./actions")
      const result = await updateCandidateQualifications({
        skills: "Pflege, Betreuung",
        certifications: "SVEB-Zertifikat",
        languages: "Deutsch, Französisch",
        experienceYears: "5",
        preferredRegions: "Kanton Zürich",
      })

      expect(result).toEqual({ success: true })
      expect(client.from("candidates").update).toHaveBeenCalledWith({
        skills: ["Pflege", "Betreuung"],
        certifications: ["SVEB-Zertifikat"],
        languages: ["Deutsch", "Französisch"],
        experience_years: 5,
        preferred_regions: ["Kanton Zürich"],
      })
    })
  })

  describe("setOwnCandidateDocumentPath", () => {
    it("refuses to write a document path for a different candidate id", async () => {
      vi.doMock("@/lib/auth/get-current-profile", () => ({
        getCurrentProfile: async () => activeCandidateProfile,
      }))
      vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => mockSupabaseClient() }))

      const { setOwnCandidateDocumentPath } = await import("./actions")
      const result = await setOwnCandidateDocumentPath("99999999-9999-4999-a999-999999999999", "path/cv.pdf")

      expect(result).toEqual({ success: false, error: "Keine Berechtigung." })
    })

    it("saves the document path for the caller's own candidate row", async () => {
      vi.doMock("@/lib/auth/get-current-profile", () => ({
        getCurrentProfile: async () => activeCandidateProfile,
      }))
      const client = mockSupabaseClient()
      vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => client }))

      const { setOwnCandidateDocumentPath } = await import("./actions")
      const result = await setOwnCandidateDocumentPath(CANDIDATE_ID, `${CANDIDATE_ID}/cv.pdf`)

      expect(result).toEqual({ success: true })
      expect(client.from("candidates").update).toHaveBeenCalledWith({
        cv_document_path: `${CANDIDATE_ID}/cv.pdf`,
      })
    })

    it("reports failure when the update matches zero rows (e.g. blocked by RLS) without a Postgres error", async () => {
      vi.doMock("@/lib/auth/get-current-profile", () => ({
        getCurrentProfile: async () => activeCandidateProfile,
      }))
      vi.doMock("@/lib/supabase/server", () => ({
        createClient: async () => mockSupabaseClient({ candidatesUpdateMatchedZeroRows: true }),
      }))

      const { setOwnCandidateDocumentPath } = await import("./actions")
      const result = await setOwnCandidateDocumentPath(CANDIDATE_ID, `${CANDIDATE_ID}/cv.pdf`)

      expect(result).toEqual({
        success: false,
        error: "Dokument-Pfad konnte nicht gespeichert werden.",
      })
    })
  })
})
