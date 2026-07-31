import { createClient } from "@/lib/supabase/server"
import { getActiveInternalProfileIds } from "@/lib/notifications/get-active-internal-profile-ids"

/** Broadcasts a "new_message" notification to every active internal user — used when a Gemeinde/Kandidat sends a message. */
export async function broadcastNewMessageToInternal(message: string): Promise<void> {
  const supabase = await createClient()
  const internalProfileIds = await getActiveInternalProfileIds()
  if (internalProfileIds.length === 0) return

  await supabase.from("notifications").insert(
    internalProfileIds.map((id) => ({
      recipient_id: id,
      type: "new_message",
      message,
    }))
  )
}
