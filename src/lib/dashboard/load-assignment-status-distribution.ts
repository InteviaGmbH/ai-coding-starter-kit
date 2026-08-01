import { createClient } from "@/lib/supabase/server"

export type AssignmentStatus = "proposed" | "accepted" | "active" | "completed"

export interface StatusDistributionPoint {
  status: AssignmentStatus
  label: string
  count: number
}

const STATUS_LABELS: Record<AssignmentStatus, string> = {
  proposed: "Vorgeschlagen",
  accepted: "Akzeptiert",
  active: "Aktiv",
  completed: "Abgeschlossen",
}

const STATUS_ORDER: AssignmentStatus[] = ["proposed", "accepted", "active", "completed"]

/**
 * Counts assignments per status. No explicit scoping needed here — RLS
 * (assignments_select) already restricts a municipality caller to their
 * own assignments (via the proposal -> request -> municipality_id chain)
 * and grants internal callers everything, exactly like the existing
 * dashboard stat-tile queries already rely on.
 */
export async function loadAssignmentStatusDistribution(): Promise<StatusDistributionPoint[]> {
  const supabase = await createClient()

  const counts = await Promise.all(
    STATUS_ORDER.map(async (status) => {
      const { count, error } = await supabase
        .from("assignments")
        .select("id", { count: "exact", head: true })
        .eq("status", status)

      if (error) {
        console.error(`Status-Verteilung (${status}) konnte nicht geladen werden:`, error)
      }
      return count ?? 0
    })
  )

  return STATUS_ORDER.map((status, i) => ({
    status,
    label: STATUS_LABELS[status],
    count: counts[i],
  }))
}
