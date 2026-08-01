import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getRequestMetadata } from "@/lib/contracts/get-request-metadata"
import { notifyContractPartySigned, notifyContractFullySigned } from "@/lib/contracts/notify-signature-parties"
import type { ContractSigningContext } from "@/lib/contracts/load-signing-context"
import type { PartyType } from "@/lib/contracts/schema"

interface SignResult {
  success: boolean
  error?: string
}

/**
 * Shared core for all three "sign digitally" server actions (internal/
 * municipality/candidate) — each does its own auth + ownership check
 * first, then delegates here for the actual insert, notification, and
 * activity log entry. IP/user agent are captured server-side, never taken
 * from client input (see getRequestMetadata).
 */
export async function signContractDigitally(
  ctx: ContractSigningContext,
  partyType: PartyType,
  actorId: string,
  actorDisplayName: string,
  signerName: string
): Promise<SignResult> {
  const supabase = await createClient()
  const { ipAddress, userAgent } = await getRequestMetadata()

  const { error } = await supabase.from("contract_signatures").insert({
    contract_id: ctx.contractId,
    party_type: partyType,
    method: "digital",
    signer_name: signerName,
    ip_address: ipAddress,
    user_agent: userAgent,
    created_by_id: actorId,
    created_by: actorDisplayName,
  })

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Sie haben bereits unterschrieben." }
    }
    return { success: false, error: "Unterschrift konnte nicht gespeichert werden." }
  }

  await supabase.from("activity_log").insert({
    actor_id: actorId,
    entity_type: "contract_signature",
    entity_id: ctx.contractId,
    action: `signed_${partyType}`,
  })

  await finalizeSignature(ctx, partyType)

  return { success: true }
}

/**
 * Shared tail for both signing paths (digital + the candidate upload
 * fallback): the DB trigger already flipped contracts.status once all
 * three parties have signed — this decides which notification to send,
 * then revalidates every portal's assignment page.
 *
 * PROJ-15 QA fix (BUG-15-3): two parties completing the contract within
 * the same moment could each independently query "is it fully signed
 * now?" and both see yes, double-firing the completion notification. A
 * plain re-count here can't tell "I caused this" from "someone else did,
 * a moment ago" — both queries run as separate, already-committed reads.
 * claim_contract_completion_notification() atomically flips a dedicated
 * flag exactly once (Postgres row-level locking serializes concurrent
 * callers), so only whichever call actually wins the race sends it.
 */
export async function finalizeSignature(
  ctx: ContractSigningContext,
  partyType: PartyType
): Promise<void> {
  const supabase = await createClient()

  const { data: wonCompletionClaim } = await supabase.rpc(
    "claim_contract_completion_notification",
    { p_contract_id: ctx.contractId }
  )

  const recipients = {
    municipalityProfileId: ctx.municipalityProfileId,
    candidateProfileId: ctx.candidateProfileId,
  }

  if (wonCompletionClaim) {
    await notifyContractFullySigned(recipients, ctx.contractTitle)
  } else {
    await notifyContractPartySigned(partyType, recipients, ctx.contractTitle)
  }

  revalidatePath(`/internal/assignments/${ctx.assignmentId}`)
  revalidatePath(`/municipality/assignments/${ctx.assignmentId}`)
  revalidatePath(`/candidate/assignments/${ctx.assignmentId}`)
}
