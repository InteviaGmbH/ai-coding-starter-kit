import { createClient } from "@/lib/supabase/server"

export interface ContractSigningContext {
  contractId: string
  assignmentId: string
  contractTitle: string
  municipalityProfileId: string | null
  candidateProfileId: string | null
}

function toSingle<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

/**
 * Loads the context needed to sign/notify for a contract. Runs under the
 * caller's own RLS-scoped session — a municipality/candidate calling this
 * for a foreign contract simply gets null back, same as any other
 * ownership check in this codebase.
 */
export async function loadContractSigningContext(
  contractId: string
): Promise<ContractSigningContext | null> {
  const supabase = await createClient()

  const { data } = await supabase
    .from("contracts")
    .select(
      "id, assignment_id, assignment:assignments(proposal:candidate_proposals(candidate:candidates(profile_id), request:personnel_requests(title, created_by_id)))"
    )
    .eq("id", contractId)
    .maybeSingle()

  if (!data) return null

  const assignment = toSingle(data.assignment)
  const proposal = assignment ? toSingle(assignment.proposal) : null
  const request = proposal ? toSingle(proposal.request) : null
  const candidate = proposal ? toSingle(proposal.candidate) : null

  if (!request?.title) return null

  return {
    contractId: data.id,
    assignmentId: data.assignment_id,
    contractTitle: request.title,
    municipalityProfileId: request.created_by_id ?? null,
    candidateProfileId: candidate?.profile_id ?? null,
  }
}
