// German display labels for every notification `type` value currently
// written anywhere in the app (PROJ-2/5/7/8/9/10/11/17). Falls back to a
// generic label for any future, not-yet-mapped type — same defensive
// pattern as PROJ-12's activity_log description fallback.
export const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  new_request: "Neue Anfrage",
  proposal_approved: "Neuer Kandidatenvorschlag",
  proposal_decision: "Vorschlag entschieden",
  contract_ready: "Vertrag bereit",
  assignment_active: "Einsatz aktiv",
  request_reviewed: "Anfrage geprüft",
  account_approved: "Konto freigeschaltet",
  account_rejected: "Konto abgelehnt",
  new_message: "Neue Nachricht",
}

export function notificationTypeLabel(type: string): string {
  return NOTIFICATION_TYPE_LABELS[type] ?? "Sonstige"
}
