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
 * fallback): checks whether the contract is now fully signed (the DB
 * trigger already flipped contracts.status — this just decides which
 * notification to send), then revalidates every portal's assignment page.
 */
export async function finalizeSignature(
  ctx: ContractSigningContext,
  partyType: PartyType
): Promise<void> {
  const supabase = await createClient()

  const { count } = await supabase
    .from("contract_signatures")
    .select("id", { count: "exact", head: true })
    .eq("contract_id", ctx.contractId)

  const recipients = {
    municipalityProfileId: ctx.municipalityProfileId,
    candidateProfileId: ctx.candidateProfileId,
  }

  if (count === 3) {
    await notifyContractFullySigned(recipients, ctx.contractTitle)
  } else {
    await notifyContractPartySigned(partyType, recipients, ctx.contractTitle)
  }

  revalidatePath(`/internal/assignments/${ctx.assignmentId}`)
  revalidatePath(`/municipality/assignments/${ctx.assignmentId}`)
  revalidatePath(`/candidate/assignments/${ctx.assignmentId}`)
}
