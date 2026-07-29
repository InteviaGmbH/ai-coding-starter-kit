"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB
const ALLOWED_FILE_TYPES = ["application/pdf", "image/jpeg", "image/png"]

interface Props {
  candidateId: string
  documentPath: string | null
  downloadUrl: string | null
  onSave: (candidateId: string, path: string) => Promise<{ success: boolean; error?: string }>
}

export function CandidateDocumentCard({ candidateId, documentPath, downloadUrl, onSave }: Props) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return

    setError(null)

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      setError("Nur PDF, JPG oder PNG erlaubt.")
      return
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError("Datei darf maximal 10 MB gross sein.")
      return
    }

    setUploading(true)
    const supabase = createClient()
    const path = `${candidateId}/${file.name}`

    const { error: uploadError } = await supabase.storage
      .from("candidate-documents")
      .upload(path, file, { upsert: true })

    if (uploadError) {
      setUploading(false)
      setError("Datei konnte nicht hochgeladen werden.")
      return
    }

    const result = await onSave(candidateId, path)
    setUploading(false)

    if (!result.success) {
      setError(result.error ?? "Dokument-Pfad konnte nicht gespeichert werden.")
      return
    }

    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dokument</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {documentPath && downloadUrl ? (
          <p className="text-sm">
            <a href={downloadUrl} className="text-primary hover:underline" target="_blank" rel="noreferrer">
              Aktuelles Dokument herunterladen
            </a>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Noch kein Dokument hochgeladen.</p>
        )}
        <div>
          <Input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileChange}
            disabled={uploading}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            PDF, JPG oder PNG, max. 10 MB. {documentPath ? "Ersetzt das bestehende Dokument." : ""}
          </p>
        </div>
        {uploading && <Button disabled>Wird hochgeladen…</Button>}
      </CardContent>
    </Card>
  )
}
