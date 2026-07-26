"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getCurrentProfile, INTERNAL_ROLES } from "@/lib/auth/get-current-profile"

interface ActionResult {
  success: boolean
  error?: string
  id?: string
}

const STATUS_ORDER = ["proposed", "accepted", "active", "completed"] as const
type AssignmentStatus = (typeof STATUS_ORDER)[number]

async function requireInternalRole() {
  const profile = await getCurrentProfile()
  if (!profile || profile.accountStatus !== "active" || !INTERNAL_ROLES.includes(profile.role)) {
    return null
  }
  return profile
}

const createSchema = z
  .object({
    proposalId: z.string().uuid(),
    startDate: z.string().trim().min(1, "Startdatum ist erforderlich"),
    endDate: z.string().trim().optional(),
  })
  .refine((data) => !data.endDate || data.endDate >= data.startDate, {
    message: "Enddatum darf nicht vor dem Startdatum liegen",
    path: ["endDate"],
  })

export type CreateAssignmentInput = z.infer<typeof createSchema>

export async function createAssignment(input: CreateAssignmentInput): Promise<ActionResult> {
  const actor = await requireInternalRole()
  if (!actor) {
    return { success: false, error: "Keine Berechtigung." }
  }

  const parsed = createSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." }
  }

  const supabase = await createClient()

  const { data: proposal } = await supabase
    .from("candidate_proposals")
    .select("id, status")
    .eq("id", parsed.data.proposalId)
    .single()

  if (!proposal) {
    return { success: false, error: "Vorschlag nicht gefunden." }
  }
  if (proposal.status !== "municipality_accepted") {
    return {
      success: false,
      error: "Nur ein von der Gemeinde angenommener Vorschlag kann in einen Einsatz überführt werden.",
    }
  }

  const { data: existing } = await supabase
    .from("assignments")
    .select("id")
    .eq("proposal_id", parsed.data.proposalId)
    .limit(1)

  if (existing && existing.length > 0) {
    return { success: false, error: "Für diesen Vorschlag existiert bereits ein Einsatz." }
  }

  const { data: inserted, error } = await supabase
    .from("assignments")
    .insert({
      proposal_id: parsed.data.proposalId,
      status: "proposed",
      start_date: parsed.data.startDate,
      end_date: parsed.data.endDate || null,
      created_by_id: actor.id,
      created_by: actor.fullName ?? actor.email,
    })
    .select("id")

  if (error || !inserted || inserted.length === 0) {
    return { success: false, error: "Einsatz konnte nicht angelegt werden." }
  }

  await supabase.from("activity_log").insert({
    actor_id: actor.id,
    entity_type: "assignment",
    entity_id: inserted[0].id,
    action: "created",
  })

  revalidatePath("/internal/assignments")
  revalidatePath(`/internal/assignments/${inserted[0].id}`)
  revalidatePath("/municipality/assignments")
  return { success: true, id: inserted[0].id }
}

export async function advanceAssignmentStatus(assignmentId: string): Promise<ActionResult> {
  const actor = await requireInternalRole()
  if (!actor) {
    return { success: false, error: "Keine Berechtigung." }
  }

  if (!z.string().uuid().safeParse(assignmentId).success) {
    return { success: false, error: "Ungültiger Einsatz." }
  }

  const supabase = await createClient()

  const { data: assignment } = await supabase
    .from("assignments")
    .select("id, status")
    .eq("id", assignmentId)
    .single()

  if (!assignment) {
    return { success: false, error: "Einsatz nicht gefunden." }
  }

  const currentIndex = STATUS_ORDER.indexOf(assignment.status as AssignmentStatus)
  if (currentIndex === -1 || currentIndex === STATUS_ORDER.length - 1) {
    return { success: false, error: "Dieser Einsatz hat bereits die letzte Stufe erreicht." }
  }
  const nextStatus = STATUS_ORDER[currentIndex + 1]

  const { data: updated, error } = await supabase
    .from("assignments")
    .update({ status: nextStatus })
    .eq("id", assignmentId)
    .select("id")

  if (error || !updated || updated.length === 0) {
    return { success: false, error: "Status konnte nicht aktualisiert werden." }
  }

  await supabase.from("activity_log").insert({
    actor_id: actor.id,
    entity_type: "assignment",
    entity_id: assignmentId,
    action: nextStatus,
  })

  revalidatePath("/internal/assignments")
  revalidatePath(`/internal/assignments/${assignmentId}`)
  revalidatePath("/municipality/assignments")
  return { success: true }
}
