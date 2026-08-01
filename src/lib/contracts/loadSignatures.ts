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

export async function loadContractSignatures(contractId: string): Promise<PartySignatureData[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("contract_signatures")
    .select("party_type, method, signer_name, signed_at, file_path, created_by")
    .eq("contract_id", contractId)

  if (error) {
    console.error("Unterschriften konnten nicht geladen werden:", error)
  }

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

    results.push({
      partyType,
      method: row.method as "digital" | "upload",
      signerName: row.method === "digital" ? row.signer_name : (row.created_by ?? "Intern"),
      signedAt: row.signed_at,
      downloadUrl,
    })
  }

  return results
}
