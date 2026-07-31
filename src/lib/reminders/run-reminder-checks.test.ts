import { describe, it, expect, vi, beforeEach } from "vitest"

const INTERNAL_PROFILE_ID = "11111111-1111-4111-a111-111111111111"
const MUNICIPALITY_USER_ID = "22222222-2222-4222-a222-222222222222"
const CANDIDATE_USER_ID = "33333333-3333-4333-a333-333333333333"
const ASSIGNMENT_ID = "44444444-4444-4444-a444-444444444444"
const CONTRACT_ID = "55555555-5555-4555-a555-555555555555"
const PROPOSAL_ID = "66666666-6666-4666-a666-666666666666"
const VERSION_ID = "77777777-7777-4777-a777-777777777777"

function thenable(data: unknown[]) {
  const builder = {
    eq: () => builder,
    in: () => builder,
    not: () => builder,
    or: () => builder,
    lte: () => builder,
    then: (resolve: (value: { data: unknown[]; error: null }) => void) =>
      resolve({ data, error: null }),
  }
  return builder
}

interface TestConfig {
  documentVersions?: unknown[]
  startingAssignments?: unknown[]
  endingAssignments?: unknown[]
  contracts?: unknown[]
  proposals?: unknown[]
}

function mockSupabaseClient(config: TestConfig) {
  let assignmentsSelectCalls = 0
  const updateCalls: Array<{ table: string; payload: unknown }> = []
  const notificationsInsert = vi.fn(async () => ({ error: null }))

  const client = {
    from: vi.fn((table: string) => {
      if (table === "candidate_document_versions") {
        return {
          select: () => thenable(config.documentVersions ?? []),
          update: (payload: unknown) => ({
            eq: vi.fn(async () => {
              updateCalls.push({ table, payload })
              return { error: null }
            }),
          }),
        }
      }
      if (table === "assignments") {
        return {
          select: () => {
            assignmentsSelectCalls += 1
            const data = assignmentsSelectCalls === 1 ? config.startingAssignments ?? [] : config.endingAssignments ?? []
            return thenable(data)
          },
          update: (payload: unknown) => ({
            eq: vi.fn(async () => {
              updateCalls.push({ table, payload })
              return { error: null }
            }),
          }),
        }
      }
      if (table === "contracts") {
        return {
          select: () => thenable(config.contracts ?? []),
          update: (payload: unknown) => ({
            eq: vi.fn(async () => {
              updateCalls.push({ table, payload })
              return { error: null }
            }),
          }),
        }
      }
      if (table === "candidate_proposals") {
        return {
          select: () => thenable(config.proposals ?? []),
          update: (payload: unknown) => ({
            eq: vi.fn(async () => {
              updateCalls.push({ table, payload })
              return { error: null }
            }),
          }),
        }
      }
      if (table === "notifications") {
        return { insert: notificationsInsert }
      }
      throw new Error(`unexpected table: ${table}`)
    }),
  }

  return { client, notificationsInsert, updateCalls }
}

async function importRunReminderChecks(client: unknown) {
  vi.doMock("@/lib/supabase/server", () => ({ createClient: async () => client }))
  vi.doMock("@/lib/notifications/get-active-internal-profile-ids", () => ({
    getActiveInternalProfileIds: async () => [INTERNAL_PROFILE_ID],
  }))
  const { runReminderChecks } = await import("./run-reminder-checks")
  return runReminderChecks
}

describe("runReminderChecks", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it("notifies internal staff and marks the flag when a document is newly expiring soon", async () => {
    const soonDate = new Date()
    soonDate.setDate(soonDate.getDate() + 1)
    const { client, notificationsInsert, updateCalls } = mockSupabaseClient({
      documentVersions: [
        {
          id: VERSION_ID,
          expiry_date: soonDate.toISOString().slice(0, 10),
          expiring_soon_notified: false,
          expired_notified: false,
          document: { document_type: "work_permit", name: "Arbeitsbewilligung", candidate: { first_name: "Anna", last_name: "Muster" } },
        },
      ],
    })
    const runReminderChecks = await importRunReminderChecks(client)

    await runReminderChecks()

    expect(notificationsInsert).toHaveBeenCalledWith([
      expect.objectContaining({ recipient_id: INTERNAL_PROFILE_ID, type: "document_expiring_soon" }),
    ])
    expect(updateCalls).toContainEqual({
      table: "candidate_document_versions",
      payload: { expiring_soon_notified: true },
    })
  })

  it("does not re-notify a document version already marked as expiring-soon-notified even if still expiring soon", async () => {
    const soonDate = new Date()
    soonDate.setDate(soonDate.getDate() + 1)
    const { client, notificationsInsert } = mockSupabaseClient({
      documentVersions: [
        {
          id: VERSION_ID,
          expiry_date: soonDate.toISOString().slice(0, 10),
          expiring_soon_notified: true,
          expired_notified: false,
          document: { document_type: "work_permit", name: "Arbeitsbewilligung", candidate: { first_name: "Anna", last_name: "Muster" } },
        },
      ],
    })
    const runReminderChecks = await importRunReminderChecks(client)

    await runReminderChecks()

    expect(notificationsInsert).not.toHaveBeenCalled()
  })

  it("notifies municipality, candidate, and internal staff when an assignment starts soon", async () => {
    const notifyAssignmentParties = vi.fn(async () => {})
    vi.doMock("@/lib/notifications/notify-assignment-parties", () => ({ notifyAssignmentParties }))

    const { client, notificationsInsert, updateCalls } = mockSupabaseClient({
      startingAssignments: [
        {
          id: ASSIGNMENT_ID,
          proposal: {
            candidate: { profile_id: CANDIDATE_USER_ID },
            request: { title: "Sozialarbeiter:in", created_by_id: MUNICIPALITY_USER_ID },
          },
        },
      ],
    })
    const runReminderChecks = await importRunReminderChecks(client)

    await runReminderChecks()

    expect(notifyAssignmentParties).toHaveBeenCalledWith(
      { municipalityProfileId: MUNICIPALITY_USER_ID, candidateProfileId: CANDIDATE_USER_ID },
      "assignment_starting_soon",
      expect.any(String)
    )
    expect(notificationsInsert).toHaveBeenCalledWith([
      expect.objectContaining({ recipient_id: INTERNAL_PROFILE_ID, type: "assignment_starting_soon" }),
    ])
    expect(updateCalls).toContainEqual({ table: "assignments", payload: { start_reminder_sent: true } })
  })

  it("notifies internal staff when a contract's signature is overdue", async () => {
    const { client, notificationsInsert, updateCalls } = mockSupabaseClient({
      contracts: [
        {
          id: CONTRACT_ID,
          assignment: { proposal: { request: { title: "Sozialarbeiter:in" } } },
        },
      ],
    })
    const runReminderChecks = await importRunReminderChecks(client)

    await runReminderChecks()

    expect(notificationsInsert).toHaveBeenCalledWith([
      expect.objectContaining({ recipient_id: INTERNAL_PROFILE_ID, type: "contract_signature_pending" }),
    ])
    expect(updateCalls).toContainEqual({ table: "contracts", payload: { signature_reminder_sent: true } })
  })

  it("notifies internal staff when a proposal decision is overdue", async () => {
    const { client, notificationsInsert, updateCalls } = mockSupabaseClient({
      proposals: [
        {
          id: PROPOSAL_ID,
          request: { title: "Sozialarbeiter:in" },
          candidate: { first_name: "Anna", last_name: "Muster" },
        },
      ],
    })
    const runReminderChecks = await importRunReminderChecks(client)

    await runReminderChecks()

    expect(notificationsInsert).toHaveBeenCalledWith([
      expect.objectContaining({ recipient_id: INTERNAL_PROFILE_ID, type: "proposal_decision_pending" }),
    ])
    expect(updateCalls).toContainEqual({ table: "candidate_proposals", payload: { decision_reminder_sent: true } })
  })
})
