import { createClient } from "@/lib/supabase/server"
import type { NoteEntityType } from "@/lib/notes/schema"
import type { InternalNoteData } from "@/components/portal/internal-notes-panel"

const entityColumn: Record<NoteEntityType, string> = {
  candidate: "candidate_id",
  request: "request_id",
  assignment: "assignment_id",
}

export async function loadInternalNotes(
  entityType: NoteEntityType,
  entityId: string
): Promise<InternalNoteData[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("internal_notes")
    .select("id, content, created_date, created_by")
    .eq("entity_type", entityType)
    .eq(entityColumn[entityType], entityId)
    .order("created_date", { ascending: false })

  if (error) {
    console.error("Interne Notizen konnten nicht geladen werden:", error)
  }

  return (data ?? []).map((n) => ({
    id: n.id,
    content: n.content,
    createdDate: n.created_date,
    authorName: n.created_by ?? "Unbekannt",
  }))
}
