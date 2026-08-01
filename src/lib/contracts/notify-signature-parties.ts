import { createClient } from "@/lib/supabase/server"
import { getActiveInternalProfileIds } from "@/lib/notifications/get-active-internal-profile-ids"
import { notifyAssignmentParties } from "@/lib/notifications/notify-assignment-parties"
import type { PartyType } from "@/lib/contracts/schema"

const PARTY_LABELS: Record<PartyType, string> = {
  dafinex: "Dafinex",
  municipality: "Die Gemeinde",
  candidate: "Der Kandidat",
}

interface SignatureRecipients {
  municipalityProfileId: string | null
  candidateProfileId: string | null
}

/** Notifies whichever of the other two parties has a real recipient — never the party that just signed. */
export async function notifyContractPartySigned(
  signedParty: PartyType,
  recipients: SignatureRecipients,
  contractTitle: string
): Promise<void> {
  const message = `${PARTY_LABELS[signedParty]} hat den Vertrag für „${contractTitle}" unterschrieben.`

  await notifyAssignmentParties(
    {
      municipalityProfileId: signedParty !== "municipality" ? recipients.municipalityProfileId : null,
      candidateProfileId: signedParty !== "candidate" ? recipients.candidateProfileId : null,
    },
    "contract_party_signed",
    message
  )

  if (signedParty !== "dafinex") {
    const internalIds = await getActiveInternalProfileIds()
    if (internalIds.length > 0) {
      const supabase = await createClient()
      await supabase.from("notifications").insert(
        internalIds.map((id) => ({ recipient_id: id, type: "contract_party_signed", message }))
      )
    }
  }
}

export async function notifyContractFullySigned(
  recipients: SignatureRecipients,
  contractTitle: string
): Promise<void> {
  await notifyAssignmentParties(
    recipients,
    "contract_signed",
    `Der Vertrag für „${contractTitle}" ist vollständig unterschrieben.`
  )
}
