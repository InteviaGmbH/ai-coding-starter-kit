import { createAdminClient } from "@/lib/supabase/admin"

/**
 * Read-only admin-client lookup of active internal profile ids — a
 * Gemeinde/Kandidat actor has no RLS access to other profiles rows, so
 * this is required to know WHO to notify when broadcasting. The actual
 * notification insert still goes through the normal, RLS-checked client
 * (notifications_insert_counterpart_new_message / ..._new_request).
 * Same pattern as PROJ-11's createPersonnelRequest broadcast.
 */
export async function getActiveInternalProfileIds(): Promise<string[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from("profiles")
    .select("id")
    .in("role", ["super_admin", "dafinex_admin", "internal_coordinator"])
    .eq("account_status", "active")

  return (data ?? []).map((p) => p.id)
}
