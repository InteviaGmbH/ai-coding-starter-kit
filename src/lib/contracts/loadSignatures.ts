import { createClient } from "@/lib/supabase/server"
import type { PartyType } from "@/lib/contracts/schema"

export interface PartySignatureData {
  partyType: PartyType
  method: "digital" | "upload" | null
  signerName: string | null
  signedAt: string | null
  downloadUrl: string | null
}

const PARTY_ORDER: PartyType[] = ["dafinex", "municipality", "candidate"]

function toSingle<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

export async function loadContractSignatures(contractId: string): Promise<PartySignatureData[]> {
  const supabase = await createClient()

  const [{ data, error }, contractResult] = await Promise.all([
    supabase
      .from("contract_signatures")
      .select("party_type, method, signer_name, signed_at, file_path, created_by")
      .eq("contract_id", contractId),
    // PROJ-15 QA fix (BUG-15-2): the candidate fallback upload has no
    // "signer_name" (only internal staff performs it, on the candidate's
    // behalf) — look up the candidate's own name so the audit trail
    // attributes it to them, not to whichever internal person clicked
    // upload.
    supabase
      .from("contracts")
      .select(
        "assignment:assignments(proposal:candidate_proposals(candidate:candidates(first_name, last_name)))"
      )
      .eq("id", contractId)
      .maybeSingle(),
  ])

  if (error) {
    console.error("Unterschriften konnten nicht geladen werden:", error)
  }

  const assignment = toSingle(contractResult.data?.assignment)
  const proposal = assignment ? toSingle(assignment.proposal) : null
  const candidate = proposal ? toSingle(proposal.candidate) : null
  const candidateName = candidate ? `${candidate.first_name} ${candidate.last_name}` : null

  const rows = data ?? []
  const byParty = new Map(rows.map((r) => [r.party_type as PartyType, r]))

  const results: PartySignatureData[] = []
  for (const partyType of PARTY_ORDER) {
    const row = byParty.get(partyType)
    if (!row) {
      results.push({ partyType, method: null, signerName: null, signedAt: null, downloadUrl: null })
      continue
    }

    let downloadUrl: string | null = null
    if (row.method === "upload" && row.file_path) {
      const { data: signed, error: signError } = await supabase.storage
        .from("contracts")
        .createSignedUrl(row.file_path, 300)
      if (signError) {
        console.error("Signierter Download-Link (Unterschrift) konnte nicht erstellt werden:", signError)
      }
      downloadUrl = signed?.signedUrl ?? null
    }

    let signerName: string | null
    if (row.method === "digital") {
      signerName = row.signer_name
    } else if (partyType === "candidate") {
      signerName = candidateName ?? row.created_by ?? "Unbekannt"
    } else {
      signerName = row.created_by ?? "Intern"
    }

    results.push({
      partyType,
      method: row.method as "digital" | "upload",
      signerName,
      signedAt: row.signed_at,
      downloadUrl,
    })
  }

  return results
}
