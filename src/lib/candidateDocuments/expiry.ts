export type ExpiryStatus = "none" | "ok" | "expiring_soon" | "expired"

const WARNING_WINDOW_DAYS = 30

/** Classifies a document's expiry date relative to a reference date
 * (defaults to now). No expiry date set is "none" — never penalized,
 * consistent with how missing candidate data is treated elsewhere in
 * this app (PROJ-20/14). */
export function getExpiryStatus(
  expiryDate: string | null,
  referenceDate: Date = new Date()
): ExpiryStatus {
  if (!expiryDate) return "none"

  // Compare at calendar-day granularity — truncate the reference to local
  // midnight too, otherwise "expires today" would read as already expired
  // for every hour after midnight on the expiry day.
  const expiry = new Date(`${expiryDate}T00:00:00`)
  const referenceMidnight = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  )
  const diffDays = (expiry.getTime() - referenceMidnight.getTime()) / (1000 * 60 * 60 * 24)

  if (diffDays < 0) return "expired"
  if (diffDays <= WARNING_WINDOW_DAYS) return "expiring_soon"
  return "ok"
}
