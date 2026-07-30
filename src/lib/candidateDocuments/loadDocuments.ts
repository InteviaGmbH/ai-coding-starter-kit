import { createClient } from "@/lib/supabase/server"
import type {
  CandidateDocumentData,
  DocumentVersionData,
} from "@/components/portal/candidate-document-slot"
import type { ArchivedDocumentData } from "@/components/portal/candidate-archived-documents"
import type { CandidateDocumentType } from "@/lib/candidateDocuments/schema"

interface DocumentRow {
  id: string
  document_type: CandidateDocumentType
  name: string
  is_archived: boolean
}

interface VersionRow {
  id: string
  document_id: string
  file_path: string
  uploaded_at: string
  expiry_date: string | null
  is_current: boolean
}

export interface LoadedCandidateDocuments {
  cv: CandidateDocumentData | null
  workPermit: CandidateDocumentData | null
  certificates: CandidateDocumentData[]
  archivedDocuments: ArchivedDocumentData[]
}

export async function loadCandidateDocuments(candidateId: string): Promise<LoadedCandidateDocuments> {
  const supabase = await createClient()

  const { data: documents, error: documentsError } = await supabase
    .from("candidate_documents")
    .select("id, document_type, name, is_archived")
    .eq("candidate_id", candidateId)
    .order("created_date", { ascending: true })

  if (documentsError) {
    console.error("Kandidaten-Dokumente konnten nicht geladen werden:", documentsError)
  }

  const documentRows: DocumentRow[] = documents ?? []
  const documentIds = documentRows.map((d) => d.id)

  const { data: versions, error: versionsError } =
    documentIds.length > 0
      ? await supabase
          .from("candidate_document_versions")
          .select("id, document_id, file_path, uploaded_at, expiry_date, is_current")
          .in("document_id", documentIds)
          .order("uploaded_at", { ascending: false })
      : { data: [] as VersionRow[], error: null }

  if (versionsError) {
    console.error("Dokument-Versionen konnten nicht geladen werden:", versionsError)
  }

  const versionRows: VersionRow[] = versions ?? []

  // Sign every fetched version's file path once, up front, so both the
  // "current" and "history" views can just read a plain URL string.
  const downloadUrlByPath = new Map<string, string | null>()
  for (const v of versionRows) {
    if (downloadUrlByPath.has(v.file_path)) continue
    const { data: signed, error: signError } = await supabase.storage
      .from("candidate-documents")
      .createSignedUrl(v.file_path, 300)
    if (signError) {
      console.error("Signierter Download-Link konnte nicht erstellt werden:", signError)
    }
    downloadUrlByPath.set(v.file_path, signed?.signedUrl ?? null)
  }

  function toVersionData(v: VersionRow): DocumentVersionData {
    return {
      id: v.id,
      uploadedAt: v.uploaded_at,
      expiryDate: v.expiry_date,
      downloadUrl: downloadUrlByPath.get(v.file_path) ?? null,
    }
  }

  function buildDocument(row: DocumentRow): CandidateDocumentData {
    const docVersions = versionRows.filter((v) => v.document_id === row.id)
    // An archived document has no "current" version to show as active —
    // its whole history (including what's technically flagged is_current
    // underneath) is only visible via the archived-documents view.
    const currentRow = row.is_archived ? undefined : docVersions.find((v) => v.is_current)
    const currentVersion = currentRow ? toVersionData(currentRow) : null
    const history = docVersions.filter((v) => v.id !== currentRow?.id).map(toVersionData)

    return {
      id: row.id,
      name: row.name,
      currentVersion,
      history,
    }
  }

  const cvRow = documentRows.find((d) => d.document_type === "cv" && !d.is_archived) ?? null
  const workPermitRow =
    documentRows.find((d) => d.document_type === "work_permit" && !d.is_archived) ?? null
  const certificateRows = documentRows.filter(
    (d) => d.document_type === "certificate" && !d.is_archived
  )

  const archivedRows = documentRows.filter((d) => d.is_archived)

  return {
    cv: cvRow ? buildDocument(cvRow) : null,
    workPermit: workPermitRow ? buildDocument(workPermitRow) : null,
    certificates: certificateRows.map(buildDocument),
    archivedDocuments: archivedRows.map((row) => ({
      id: row.id,
      documentType: row.document_type,
      name: row.name,
      versions: versionRows.filter((v) => v.document_id === row.id).map(toVersionData),
    })),
  }
}
