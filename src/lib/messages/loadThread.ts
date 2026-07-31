import { createClient } from "@/lib/supabase/server"
import type { MessageData } from "@/components/portal/message-thread"

export type MessageThreadFilter =
  | { messageType: "request"; requestId: string }
  | { messageType: "assignment"; assignmentId: string }
  | { messageType: "general_candidate"; candidateId: string }
  | { messageType: "general_municipality"; municipalityId: string }

interface MessageRow {
  id: string
  subject: string | null
  content: string
  sent_by_internal: boolean
  created_date: string
  created_by: string | null
}

function filterColumns(filter: MessageThreadFilter): { column: string; value: string } {
  switch (filter.messageType) {
    case "request":
      return { column: "request_id", value: filter.requestId }
    case "assignment":
      return { column: "assignment_id", value: filter.assignmentId }
    case "general_candidate":
      return { column: "candidate_id", value: filter.candidateId }
    case "general_municipality":
      return { column: "municipality_id", value: filter.municipalityId }
  }
}

/**
 * Loads a message thread and marks messages from the other side as read —
 * PROJ-17: read status flips automatically on open, no explicit click.
 * `isInternalViewer` decides which of the two independent read flags gets
 * updated (read_by_internal vs. read_by_counterpart).
 */
export async function loadMessageThread(
  filter: MessageThreadFilter,
  isInternalViewer: boolean
): Promise<{ subject: string | null; messages: MessageData[] }> {
  const supabase = await createClient()
  const readColumn = isInternalViewer ? "read_by_internal" : "read_by_counterpart"
  const { column, value } = filterColumns(filter)

  const { error: markReadError } = await supabase
    .from("messages")
    .update({ [readColumn]: true })
    .eq("message_type", filter.messageType)
    .eq(column, value)
    .eq(readColumn, false)
  if (markReadError) {
    console.error("Nachrichten konnten nicht als gelesen markiert werden:", markReadError)
  }

  const { data, error } = await supabase
    .from("messages")
    .select("id, subject, content, sent_by_internal, created_date, created_by")
    .eq("message_type", filter.messageType)
    .eq(column, value)
    .order("created_date", { ascending: true })

  if (error) {
    console.error("Nachrichtenverlauf konnte nicht geladen werden:", error)
  }

  const rows: MessageRow[] = data ?? []
  const subject = rows.find((r) => r.subject)?.subject ?? null

  return {
    subject,
    messages: rows.map((r) => ({
      id: r.id,
      content: r.content,
      sentByInternal: r.sent_by_internal,
      createdDate: r.created_date,
      senderName: r.created_by ?? "Unbekannt",
    })),
  }
}
