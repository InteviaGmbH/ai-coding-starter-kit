"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getCurrentProfile } from "@/lib/auth/get-current-profile"

interface ActionResult {
  success: boolean
  error?: string
}

async function requirePartnerCompany() {
  const profile = await getCurrentProfile()
  if (
    !profile ||
    profile.accountStatus !== "active" ||
    profile.role !== "partner_company" ||
    !profile.partnerCompanyId
  ) {
    return null
  }
  return profile
}

export async function proposeCandidateAsPartner(
  requestId: string,
  candidateId: string
): Promise<ActionResult> {
  const actor = await requirePartnerCompany()
  if (!actor) {
    return { success: false, error: "Keine Berechtigung." }
  }

  const idsSchema = z.object({ requestId: z.string().uuid(), candidateId: z.string().uuid() })
  const parsed = idsSchema.safeParse({ requestId, candidateId })
  if (!parsed.success) {
    return { success: false, error: "Ungültige Anfrage oder Kandidat." }
  }

  const supabase = await createClient()

  const { data: request } = await supabase
    .from("personnel_requests")
    .select("id, visible_to_partners")
    .eq("id", requestId)
    .single()

  if (!request || !request.visible_to_partners) {
    return { success: false, error: "Diese Anfrage ist nicht (mehr) für Partnerfirmen freigegeben." }
  }

  const { data: candidate } = await supabase
    .from("candidates")
    .select("id, partner_company_id")
    .eq("id", candidateId)
    .single()

  if (!candidate || candidate.partner_company_id !== actor.partnerCompanyId) {
    return { success: false, error: "Kandidat nicht gefunden." }
  }

  const { data: existing } = await supabase
    .from("candidate_proposals")
    .select("id")
    .eq("request_id", requestId)
    .eq("candidate_id", candidateId)
    .eq("status", "proposed")
    .limit(1)

  if (existing && existing.length > 0) {
    return {
      success: false,
      error: "Dieser Kandidat wurde für diese Anfrage bereits vorgeschlagen und wartet noch auf Entscheidung.",
    }
  }

  const { data: inserted, error } = await supabase
    .from("candidate_proposals")
    .insert({
      request_id: requestId,
      candidate_id: candidateId,
      proposed_by_id: actor.id,
      status: "proposed",
      created_by_id: actor.id,
      created_by: actor.fullName ?? actor.email,
    })
    .select("id")

  if (error || !inserted || inserted.length === 0) {
    return { success: false, error: "Vorschlag konnte nicht angelegt werden." }
  }

  await supabase.from("activity_log").insert({
    actor_id: actor.id,
    entity_type: "candidate_proposal",
    entity_id: inserted[0].id,
    action: "proposed",
  })

  revalidatePath("/partner/requests")
  return { success: true }
}
