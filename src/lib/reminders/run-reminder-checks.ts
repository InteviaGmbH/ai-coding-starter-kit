import { createClient } from "@/lib/supabase/server"
import { getExpiryStatus } from "@/lib/candidateDocuments/expiry"
import { getActiveInternalProfileIds } from "@/lib/notifications/get-active-internal-profile-ids"
import { notifyAssignmentParties } from "@/lib/notifications/notify-assignment-parties"

const REMINDER_THRESHOLD_DAYS = 3

function daysFromNowIsoDate(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function isoTimestampDaysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

async function notifyInternalBroadcast(
  internalProfileIds: string[],
  type: string,
  message: string
): Promise<void> {
  if (internalProfileIds.length === 0) return
  const supabase = await createClient()
  await supabase.from("notifications").insert(
    internalProfileIds.map((id) => ({ recipient_id: id, type, message }))
  )
}

interface DocumentVersionRow {
  id: string
  expiry_date: string | null
  expiring_soon_notified: boolean
  expired_notified: boolean
  document: {
    document_type: string
    name: string
    candidate: { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null
  } | {
    document_type: string
    name: string
    candidate: { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null
  }[] | null
}

function toSingle<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

async function checkDocumentExpiry(): Promise<void> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("candidate_document_versions")
    .select(
      "id, expiry_date, expiring_soon_notified, expired_notified, document:candidate_documents(document_type, name, candidate:candidates(first_name, last_name))"
    )
    .eq("is_current", true)
    .not("expiry_date", "is", null)
    .or("expiring_soon_notified.eq.false,expired_notified.eq.false")

  if (error) {
    console.error("Ablauf-Erinnerungscheck: Dokument-Versionen konnten nicht geladen werden:", error)
    return
  }

  const versions: DocumentVersionRow[] = data ?? []
  if (versions.length === 0) return

  const internalProfileIds = await getActiveInternalProfileIds()

  for (const version of versions) {
    const status = getExpiryStatus(version.expiry_date)
    const document = toSingle(version.document)
    const candidate = document ? toSingle(document.candidate) : null
    const candidateName = candidate ? `${candidate.first_name} ${candidate.last_name}` : "Unbekannt"
    const documentLabel = document?.name ?? "Dokument"

    if (status === "expiring_soon" && !version.expiring_soon_notified) {
      await notifyInternalBroadcast(
        internalProfileIds,
        "document_expiring_soon",
        `Dokument „${documentLabel}" von ${candidateName} läuft bald ab (${version.expiry_date}).`
      )
      await supabase
        .from("candidate_document_versions")
        .update({ expiring_soon_notified: true })
        .eq("id", version.id)
    } else if (status === "expired" && !version.expired_notified) {
      await notifyInternalBroadcast(
        internalProfileIds,
        "document_expired",
        `Dokument „${documentLabel}" von ${candidateName} ist abgelaufen (${version.expiry_date}).`
      )
      await supabase.from("candidate_document_versions").update({ expired_notified: true }).eq("id", version.id)
    }
  }
}

interface AssignmentReminderRow {
  id: string
  proposal:
    | {
        candidate: { profile_id: string | null } | { profile_id: string | null }[] | null
        request: { title: string; created_by_id: string | null } | { title: string; created_by_id: string | null }[] | null
      }
    | {
        candidate: { profile_id: string | null } | { profile_id: string | null }[] | null
        request: { title: string; created_by_id: string | null } | { title: string; created_by_id: string | null }[] | null
      }[]
    | null
}

async function checkAssignmentDates(): Promise<void> {
  const supabase = await createClient()
  const threshold = daysFromNowIsoDate(REMINDER_THRESHOLD_DAYS)
  const internalProfileIds = await getActiveInternalProfileIds()

  const { data: startingSoon, error: startError } = await supabase
    .from("assignments")
    .select(
      "id, proposal:candidate_proposals(candidate:candidates(profile_id), request:personnel_requests(title, created_by_id))"
    )
    .in("status", ["proposed", "accepted"])
    .eq("start_reminder_sent", false)
    .not("start_date", "is", null)
    .lte("start_date", threshold)

  if (startError) {
    console.error("Erinnerungscheck: bald startende Einsätze konnten nicht geladen werden:", startError)
  }

  for (const row of (startingSoon ?? []) as AssignmentReminderRow[]) {
    const proposal = toSingle(row.proposal)
    const request = proposal ? toSingle(proposal.request) : null
    const candidate = proposal ? toSingle(proposal.candidate) : null
    if (!request?.title) continue

    await notifyAssignmentParties(
      { municipalityProfileId: request.created_by_id ?? null, candidateProfileId: candidate?.profile_id ?? null },
      "assignment_starting_soon",
      `Der Einsatz für „${request.title}" beginnt in Kürze.`
    )
    await notifyInternalBroadcast(
      internalProfileIds,
      "assignment_starting_soon",
      `Der Einsatz für „${request.title}" beginnt in Kürze — Status ggf. auf „aktiv" setzen.`
    )
    await supabase.from("assignments").update({ start_reminder_sent: true }).eq("id", row.id)
  }

  const { data: endingSoon, error: endError } = await supabase
    .from("assignments")
    .select(
      "id, proposal:candidate_proposals(candidate:candidates(profile_id), request:personnel_requests(title, created_by_id))"
    )
    .eq("status", "active")
    .eq("end_reminder_sent", false)
    .not("end_date", "is", null)
    .lte("end_date", threshold)

  if (endError) {
    console.error("Erinnerungscheck: bald endende Einsätze konnten nicht geladen werden:", endError)
  }

  for (const row of (endingSoon ?? []) as AssignmentReminderRow[]) {
    const proposal = toSingle(row.proposal)
    const request = proposal ? toSingle(proposal.request) : null
    const candidate = proposal ? toSingle(proposal.candidate) : null
    if (!request?.title) continue

    await notifyAssignmentParties(
      { municipalityProfileId: request.created_by_id ?? null, candidateProfileId: candidate?.profile_id ?? null },
      "assignment_ending_soon",
      `Der Einsatz für „${request.title}" endet in Kürze.`
    )
    await notifyInternalBroadcast(
      internalProfileIds,
      "assignment_ending_soon",
      `Der Einsatz für „${request.title}" endet in Kürze — Status ggf. auf „abgeschlossen" setzen.`
    )
    await supabase.from("assignments").update({ end_reminder_sent: true }).eq("id", row.id)
  }
}

interface ContractReminderRow {
  id: string
  assignment:
    | {
        proposal:
          | {
              request: { title: string } | { title: string }[] | null
            }
          | {
              request: { title: string } | { title: string }[] | null
            }[]
          | null
      }
    | {
        proposal:
          | {
              request: { title: string } | { title: string }[] | null
            }
          | {
              request: { title: string } | { title: string }[] | null
            }[]
          | null
      }[]
    | null
}

async function checkPendingSignatures(): Promise<void> {
  const supabase = await createClient()
  const threshold = isoTimestampDaysAgo(REMINDER_THRESHOLD_DAYS)
  const internalProfileIds = await getActiveInternalProfileIds()

  const { data, error } = await supabase
    .from("contracts")
    .select("id, assignment:assignments(proposal:candidate_proposals(request:personnel_requests(title)))")
    .eq("status", "generated")
    .eq("signature_reminder_sent", false)
    .lte("updated_date", threshold)

  if (error) {
    console.error("Erinnerungscheck: ausstehende Unterschriften konnten nicht geladen werden:", error)
    return
  }

  for (const row of (data ?? []) as ContractReminderRow[]) {
    const assignment = toSingle(row.assignment)
    const proposal = assignment ? toSingle(assignment.proposal) : null
    const request = proposal ? toSingle(proposal.request) : null
    const label = request?.title ? `„${request.title}"` : "ein Einsatz"

    await notifyInternalBroadcast(
      internalProfileIds,
      "contract_signature_pending",
      `Der Vertrag für ${label} wartet seit mindestens ${REMINDER_THRESHOLD_DAYS} Tagen auf die Unterschrift.`
    )
    await supabase.from("contracts").update({ signature_reminder_sent: true }).eq("id", row.id)
  }
}

interface ProposalReminderRow {
  id: string
  request: { title: string } | { title: string }[] | null
  candidate: { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null
}

async function checkPendingProposalDecisions(): Promise<void> {
  const supabase = await createClient()
  const threshold = isoTimestampDaysAgo(REMINDER_THRESHOLD_DAYS)
  const internalProfileIds = await getActiveInternalProfileIds()

  const { data, error } = await supabase
    .from("candidate_proposals")
    .select("id, request:personnel_requests(title), candidate:candidates(first_name, last_name)")
    .eq("status", "approved")
    .eq("decision_reminder_sent", false)
    .lte("updated_date", threshold)

  if (error) {
    console.error("Erinnerungscheck: unbearbeitete Vorschläge konnten nicht geladen werden:", error)
    return
  }

  for (const row of (data ?? []) as ProposalReminderRow[]) {
    const request = toSingle(row.request)
    const candidate = toSingle(row.candidate)
    const candidateName = candidate ? `${candidate.first_name} ${candidate.last_name}` : "ein Kandidat"

    await notifyInternalBroadcast(
      internalProfileIds,
      "proposal_decision_pending",
      `Der Vorschlag von ${candidateName} für „${request?.title ?? "eine Anfrage"}" wartet seit mindestens ${REMINDER_THRESHOLD_DAYS} Tagen auf die Entscheidung der Gemeinde.`
    )
    await supabase.from("candidate_proposals").update({ decision_reminder_sent: true }).eq("id", row.id)
  }
}

/**
 * Central, event-based reminder check — run as a side effect of loading
 * /internal/dashboard (visited by every internal user on every login).
 * No cron/scheduled-job infrastructure exists in this project; this is the
 * pragmatic substitute agreed on for the pilot (PROJ-18).
 */
export async function runReminderChecks(): Promise<void> {
  await checkDocumentExpiry()
  await checkAssignmentDates()
  await checkPendingSignatures()
  await checkPendingProposalDecisions()
}
