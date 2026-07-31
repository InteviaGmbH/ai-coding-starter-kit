"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export interface InternalNoteData {
  id: string
  content: string
  createdDate: string
  authorName: string
}

interface ActionResult {
  success: boolean
  error?: string
}

interface Props {
  notes: InternalNoteData[]
  onAdd: (content: string) => Promise<ActionResult>
  onDelete: (id: string) => Promise<ActionResult>
}

export function InternalNotesPanel({ notes, onAdd, onDelete }: Props) {
  const router = useRouter()
  const [content, setContent] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleAdd() {
    setError(null)
    if (!content.trim()) {
      setError("Notiztext ist erforderlich.")
      return
    }

    setSaving(true)
    const result = await onAdd(content.trim())
    setSaving(false)

    if (!result.success) {
      setError(result.error ?? "Notiz konnte nicht gespeichert werden.")
      return
    }

    setContent("")
    router.refresh()
  }

  async function handleDelete(id: string) {
    const result = await onDelete(id)
    if (!result.success) {
      setError(result.error ?? "Notiz konnte nicht gelöscht werden.")
      return
    }
    router.refresh()
  }

  return (
    <Card className="border-dashed">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>Interne Notizen</CardTitle>
          <Badge variant="secondary">Nur intern sichtbar</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Noch keine Notizen.</p>
        ) : (
          <ul className="space-y-2">
            {notes.map((note) => (
              <li key={note.id} className="rounded-md border p-3 text-sm">
                <p className="whitespace-pre-wrap">{note.content}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {note.authorName} · {new Date(note.createdDate).toLocaleString("de-CH")}
                  </span>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        Löschen
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Notiz löschen?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Diese Notiz wird endgültig entfernt und kann nicht wiederhergestellt
                          werden.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(note.id)}>
                          Löschen
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-2 border-t pt-4">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Neue Notiz eingeben…"
            disabled={saving}
          />
          <Button onClick={handleAdd} disabled={saving}>
            {saving ? "Wird gespeichert…" : "Notiz hinzufügen"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
