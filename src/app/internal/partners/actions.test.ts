import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

const dafinexAdminProfile = {
  id: "11111111-1111-4111-a111-111111111111",
  email: "admin@dafinex.ch",
  fullName: "Admin",
  role: "dafinex_admin" as const,
  accountStatus: "active" as const,
  municipalityId: null,
  candidateId: null,
  partnerCompanyId: null,
}

const COMPANY_ID = "22222222-2222-4222-a222-222222222222"
const INVITED_USER_ID = "33333333-3333-4333-a333-333333333333"

function mockSupabaseClient(opts?: {
  companyInsertError?: { message: string } | null
  profileUpdateError?: { message: string } | null
  companyDeleteSpy?: ReturnType<typeof vi.fn>
  linkedProfilesCount?: number
  deleteError?: { message: string; code?: string } | null
}) {
  const companyInsertError = opts?.companyInsertError ?? null
  const profileUpdateError = opts?.profileUpdateError ?? null
  const linkedProfilesCount = opts?.linkedProfilesCount ?? 0
  const deleteError = opts?.deleteError ?? null

  const partnerCompanies = {
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(async () => ({
          data: companyInsertError ? null : { id: COMPANY_ID },
          error: companyInsertError,
        })),
      })),
    })),
    update: vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) })),
    delete: vi.fn(() => ({
      eq: opts?.companyDeleteSpy ?? vi.fn(async () => ({ error: deleteError })),
    })),
  }

  const profiles = {
    update: vi.fn(() => ({ eq: vi.fn(async () => ({ error: profileUpdateError })) })),
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        head: undefined,
        then: (resolve: (v: { count: number }) => void) => resolve({ count: linkedProfilesCount }),
      })),
    })),
  }

  return {
    from: vi.fn((table: string) => {
      if (table === "partner_companies") return partnerCompanies
      if (table === "profiles") return profiles
      throw new Error(`unexpected table: ${table}`)
    }),
  }
}

function mockAdminClient(opts?: {
  inviteError?: { message: string } | null
  invitedUserId?: string | null
  deleteUserSpy?: ReturnType<typeof vi.fn>
}) {
  const inviteError = opts?.inviteError ?? null
  const invitedUserId = opts?.invitedUserId === undefined ? INVITED_USER_ID : opts.invitedUserId

  return {
    auth: {
      admin: {
        inviteUserByEmail: vi.fn(async () => ({
          data: { user: invitedUserId ? { id: invitedUserId } : null },
          error: inviteError,
        })),
        deleteUser: opts?.deleteUserSpy ?? vi.fn(async () => ({})),
      },
    },
  }
}

async function importActions(
  client: ReturnType<typeof mockSupabaseClient>,
  admin: ReturnType<typeof mockAdminClient>,
  profile = dafinexAdminProfile
) {
  vi.doMock("@/lib/auth/get-current-profile", () => ({
    getCurrentProfile: async () => profile,
    INTERNAL_ROLES: ["super_admin", "dafinex_admin", "internal_coordinator"],
  }))
  vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => client }))
  vi.doMock("@/lib/supabase/admin", () => ({ createAdminClient: () => admin }))
  vi.doMock("next/headers", () => ({
    headers: async () => new Map([["host", "app.dafinex.ch"]]),
  }))
  return import("./actions")
}

describe("createPartnerCompany", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it("rejects when the caller is internal_coordinator, not dafinex_admin/super_admin", async () => {
    const { createPartnerCompany } = await importActions(mockSupabaseClient(), mockAdminClient(), {
      ...dafinexAdminProfile,
      role: "internal_coordinator",
    })

    const result = await createPartnerCompany({
      name: "TestFirma",
      commissionRate: 10,
      firstUserEmail: "test@firma.ch",
      firstUserFullName: "Max Muster",
    })

    expect(result).toEqual({ success: false, error: "Keine Berechtigung." })
  })

  it("rejects when the caller is not an internal role at all", async () => {
    const { createPartnerCompany } = await importActions(mockSupabaseClient(), mockAdminClient(), {
      ...dafinexAdminProfile,
      role: "municipality",
    })

    const result = await createPartnerCompany({
      name: "TestFirma",
      commissionRate: null,
      firstUserEmail: "test@firma.ch",
      firstUserFullName: "Max Muster",
    })

    expect(result).toEqual({ success: false, error: "Keine Berechtigung." })
  })

  it("creates the company and invites+elevates the first account on the happy path", async () => {
    const client = mockSupabaseClient()
    const admin = mockAdminClient()
    const { createPartnerCompany } = await importActions(client, admin)

    const result = await createPartnerCompany({
      name: "TestFirma",
      commissionRate: 10,
      firstUserEmail: "test@firma.ch",
      firstUserFullName: "Max Muster",
    })

    expect(result).toEqual({ success: true, id: COMPANY_ID })
    expect(admin.auth.admin.inviteUserByEmail).toHaveBeenCalledWith("test@firma.ch", {
      data: { full_name: "Max Muster" },
      redirectTo: "https://app.dafinex.ch/auth/confirm?next=/reset-password",
    })
    expect(client.from("profiles").update).toHaveBeenCalledWith(
      expect.objectContaining({
        role: "partner_company",
        partner_company_id: COMPANY_ID,
        account_status: "active",
      })
    )
  })

  it("rolls back the just-created company when the invite fails", async () => {
    const deleteSpy = vi.fn(async () => ({ error: null }))
    const client = mockSupabaseClient({ companyDeleteSpy: deleteSpy })
    const admin = mockAdminClient({
      inviteError: { message: "already been registered" },
      invitedUserId: null,
    })
    const { createPartnerCompany } = await importActions(client, admin)

    const result = await createPartnerCompany({
      name: "TestFirma",
      commissionRate: null,
      firstUserEmail: "dupe@firma.ch",
      firstUserFullName: "Max Muster",
    })

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/bereits ein Konto/)
    expect(deleteSpy).toHaveBeenCalled()
  })

  it("deletes the invited auth user if the role-elevation update fails, so a retry isn't blocked", async () => {
    const client = mockSupabaseClient({ profileUpdateError: { message: "boom" } })
    const deleteUserSpy = vi.fn(async () => ({}))
    const admin = mockAdminClient({ deleteUserSpy })
    const { createPartnerCompany } = await importActions(client, admin)

    const result = await createPartnerCompany({
      name: "TestFirma",
      commissionRate: null,
      firstUserEmail: "test@firma.ch",
      firstUserFullName: "Max Muster",
    })

    expect(result.success).toBe(false)
    expect(deleteUserSpy).toHaveBeenCalledWith(INVITED_USER_ID)
  })
})

describe("updatePartnerCompany", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it("allows internal_coordinator to edit company data (no auth-account privilege involved)", async () => {
    const client = mockSupabaseClient()
    const { updatePartnerCompany } = await importActions(client, mockAdminClient(), {
      ...dafinexAdminProfile,
      role: "internal_coordinator",
    })

    const result = await updatePartnerCompany(COMPANY_ID, { name: "Neuer Name", commissionRate: 5 })

    expect(result).toEqual({ success: true, id: COMPANY_ID })
    expect(client.from("partner_companies").update).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Neuer Name", commission_rate: 5 })
    )
  })
})

describe("deletePartnerCompany", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it("refuses to delete a partner company with linked accounts", async () => {
    const client = mockSupabaseClient({ linkedProfilesCount: 2 })
    const { deletePartnerCompany } = await importActions(client, mockAdminClient())

    const result = await deletePartnerCompany(COMPANY_ID)

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/verknüpfte Nutzerkonten/)
  })

  it("deletes a partner company with no linked accounts", async () => {
    const client = mockSupabaseClient({ linkedProfilesCount: 0 })
    const { deletePartnerCompany } = await importActions(client, mockAdminClient())

    const result = await deletePartnerCompany(COMPANY_ID)

    expect(result).toEqual({ success: true })
  })
})
