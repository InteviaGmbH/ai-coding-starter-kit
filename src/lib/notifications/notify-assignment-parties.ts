import { createClient } from "@/lib/supabase/server"

interface AssignmentPartyRecipients {
  municipalityProfileId: string | null
  candidateProfileId: string | null
}

/** Notifies the Gemeinde-Ansprechperson and/or the Kandidat about an Einsatz-related event — skips whichever recipient is missing (no portal account), without erroring. */
export async function notifyAssignmentParties(
  recipients: AssignmentPartyRecipients,
  type: string,
  message: string
): Promise<void> {
  const rows = [recipients.municipalityProfileId, recipients.candidateProfileId]
    .filter((id): id is string => !!id)
    .map((recipientId) => ({ recipient_id: recipientId, type, message }))

  if (rows.length === 0) return

  const supabase = await createClient()
  await supabase.from("notifications").insert(rows)
}
