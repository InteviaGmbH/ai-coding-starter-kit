"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getCurrentProfile, INTERNAL_ROLES } from "@/lib/auth/get-current-profile"
import { addNoteSchema } from "@/lib/notes/schema"
import type { NoteEntityType } from "@/lib/notes/schema"

interface ActionResult {
  success: boolean
  error?: string
}

const entityColumn: Record<NoteEntityType, string> = {
  candidate: "candidate_id",
  request: "request_id",
  assignment: "assignment_id",
}

const revalidatePathByEntity: Record<NoteEntityType, (id: string) => string> = {
  candidate: (id) => `/internal/candidates/${id}`,
  request: (id) => `/internal/requests/${id}`,
  assignment: (id) => `/internal/assignments/${id}`,
}

async function requireInternalRole() {
  const profile = await getCurrentProfile()
  if (!profile || profile.accountStatus !== "active" || !INTERNAL_ROLES.includes(profile.role)) {
    return null
  }
  return profile
}

export async function addInternalNote(
  entityType: NoteEntityType,
  entityId: string,
  content: string
): Promise<ActionResult> {
  const actor = await requireInternalRole()
  if (!actor) {
    return { success: false, error: "Keine Berechtigung." }
  }
  if (!z.string().uuid().safeParse(entityId).success) {
    return { success: false, error: "Ungültige Anfrage." }
  }

  const parsed = addNoteSchema.safeParse({ content })
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." }
  }

  const supabase = await createClient()

  const { error } = await supabase.from("internal_notes").insert({
    entity_type: entityType,
    [entityColumn[entityType]]: entityId,
    content: parsed.data.content,
    created_by_id: actor.id,
    created_by: actor.fullName ?? actor.email,
  })

  if (error) {
    return { success: false, error: "Notiz konnte nicht gespeichert werden." }
  }

  await supabase.from("activity_log").insert({
    actor_id: actor.id,
    entity_type: `${entityType}_note`,
    entity_id: entityId,
    action: "note_added",
  })

  revalidatePath(revalidatePathByEntity[entityType](entityId))
  return { success: true }
}

export async function deleteInternalNote(
  entityType: NoteEntityType,
  entityId: string,
  noteId: string
): Promise<ActionResult> {
  const actor = await requireInternalRole()
  if (!actor) {
    return { success: false, error: "Keine Berechtigung." }
  }
  if (
    !z.string().uuid().safeParse(entityId).success ||
    !z.string().uuid().safeParse(noteId).success
  ) {
    return { success: false, error: "Ungültige Anfrage." }
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from("internal_notes")
    .delete()
    .eq("id", noteId)
    .eq(entityColumn[entityType], entityId)
    .select("id")
    .maybeSingle()

  if (error || !data) {
    return { success: false, error: "Notiz konnte nicht gelöscht werden." }
  }

  await supabase.from("activity_log").insert({
    actor_id: actor.id,
    entity_type: `${entityType}_note`,
    entity_id: entityId,
    action: "note_deleted",
  })

  revalidatePath(revalidatePathByEntity[entityType](entityId))
  return { success: true }
}
