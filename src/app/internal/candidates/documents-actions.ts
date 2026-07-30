"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getCurrentProfile, INTERNAL_ROLES } from "@/lib/auth/get-current-profile"
import { saveDocumentVersionSchema, type SaveDocumentVersionInput } from "@/lib/candidateDocuments/schema"

interface ActionResult {
  success: boolean
  error?: string
  documentId?: string
}

async function requireInternalRole() {
  const profile = await getCurrentProfile()
  if (!profile || profile.accountStatus !== "active" || !INTERNAL_ROLES.includes(profile.role)) {
    return null
  }
  return profile
}

export async function saveCandidateDocumentVersion(
  candidateId: string,
  input: SaveDocumentVersionInput
): Promise<ActionResult> {
  const actor = await requireInternalRole()
  if (!actor) {
    return { success: false, error: "Keine Berechtigung." }
  }

  if (!z.string().uuid().safeParse(candidateId).success) {
    return { success: false, error: "Ungültige Anfrage." }
  }

  const parsed = saveDocumentVersionSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc("save_candidate_document_version", {
    p_candidate_id: candidateId,
    p_document_type: parsed.data.documentType,
    p_name: parsed.data.name,
    p_file_path: parsed.data.filePath,
    p_expiry_date: parsed.data.expiryDate || null,
    p_document_id: parsed.data.documentId ?? null,
  })

  if (error || !data) {
    return { success: false, error: "Dokument konnte nicht gespeichert werden." }
  }

  revalidatePath(`/internal/candidates/${candidateId}`)
  return { success: true, documentId: data }
}

export async function archiveCandidateDocument(
  candidateId: string,
  documentId: string
): Promise<ActionResult> {
  const actor = await requireInternalRole()
  if (!actor) {
    return { success: false, error: "Keine Berechtigung." }
  }

  if (
    !z.string().uuid().safeParse(candidateId).success ||
    !z.string().uuid().safeParse(documentId).success
  ) {
    return { success: false, error: "Ungültige Anfrage." }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("candidate_documents")
    .update({ is_archived: true })
    .eq("id", documentId)
    .select("id")
    .maybeSingle()

  if (error || !data) {
    return { success: false, error: "Dokument konnte nicht archiviert werden." }
  }

  revalidatePath(`/internal/candidates/${candidateId}`)
  return { success: true }
}
