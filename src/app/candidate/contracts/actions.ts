"use server"

import { z } from "zod"
import { getCurrentProfile } from "@/lib/auth/get-current-profile"
import { loadContractSigningContext } from "@/lib/contracts/load-signing-context"
import { signContractDigitally } from "@/lib/contracts/sign-digital"
import { signDigitalSchema, type SignDigitalInput } from "@/lib/contracts/schema"

interface ActionResult {
  success: boolean
  error?: string
}

async function requireOwnCandidateId() {
  const profile = await getCurrentProfile()
  if (
    !profile ||
    profile.accountStatus !== "active" ||
    profile.role !== "candidate" ||
    !profile.candidateId
  ) {
    return null
  }
  return profile
}

export async function signContractAsCandidate(
  contractId: string,
  input: SignDigitalInput
): Promise<ActionResult> {
  const actor = await requireOwnCandidateId()
  if (!actor) {
    return { success: false, error: "Keine Berechtigung." }
  }
  if (!z.string().uuid().safeParse(contractId).success) {
    return { success: false, error: "Ungültige Anfrage." }
  }

  const parsed = signDigitalSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." }
  }

  const ctx = await loadContractSigningContext(contractId)
  if (!ctx) {
    return { success: false, error: "Vertrag nicht gefunden." }
  }

  return signContractDigitally(
    ctx,
    "candidate",
    actor.id,
    actor.fullName ?? actor.email,
    parsed.data.signerName
  )
}
