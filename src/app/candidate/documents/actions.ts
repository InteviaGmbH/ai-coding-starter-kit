"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getCurrentProfile } from "@/lib/auth/get-current-profile"
import { saveDocumentVersionSchema, type SaveDocumentVersionInput } from "@/lib/candidateDocuments/schema"

interface ActionResult {
  success: boolean
  error?: string
  documentId?: string
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
  return profile.candidateId
}

export async function saveOwnCandidateDocumentVersion(
  input: SaveDocumentVersionInput
): Promise<ActionResult> {
  const candidateId = await requireOwnCandidateId()
  if (!candidateId) {
    return { success: false, error: "Keine Berechtigung." }
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

  revalidatePath("/candidate/profile")
  return { success: true, documentId: data }
}

export async function archiveOwnCandidateDocument(documentId: string): Promise<ActionResult> {
  const candidateId = await requireOwnCandidateId()
  if (!candidateId) {
    return { success: false, error: "Keine Berechtigung." }
  }

  if (!z.string().uuid().safeParse(documentId).success) {
    return { success: false, error: "Ungültige Anfrage." }
  }

  const supabase = await createClient()
  // .eq("candidate_id", ...) is defense in depth beyond RLS — the caller
  // could otherwise pass an arbitrary documentId and rely solely on the
  // database to reject it.
  const { data, error } = await supabase
    .from("candidate_documents")
    .update({ is_archived: true })
    .eq("id", documentId)
    .eq("candidate_id", candidateId)
    .select("id")
    .maybeSingle()

  if (error || !data) {
    return { success: false, error: "Dokument konnte nicht archiviert werden." }
  }

  revalidatePath("/candidate/profile")
  return { success: true }
}
