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
  uploadedAt: string | null
  onSave: (candidateId: string, path: string) => Promise<{ success: boolean; error?: string }>
}

export function CandidateDocumentCard({
  candidateId,
  documentPath,
  downloadUrl,
  uploadedAt,
  onSave,
}: Props) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [uploading, setUploading] = useState(false)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return

    setError(null)
    setSuccess(false)

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      setError("Nur PDF, JPG oder PNG erlaubt.")
      return
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError("Datei darf maximal 10 MB gross sein.")
      return
    }

    setUploading(true)

    try {
      const supabase = createClient()
      const path = `${candidateId}/${file.name}`

      const { error: uploadError } = await supabase.storage
        .from("candidate-documents")
        .upload(path, file, { upsert: true })

      if (uploadError) {
        const isTooLarge = /size|gross|large|payload/i.test(uploadError.message)
        setError(
          isTooLarge
            ? "Datei zu gross. Maximal 10 MB erlaubt."
            : "Datei konnte nicht hochgeladen werden. Bitte versuche es erneut."
        )
        return
      }

      const result = await onSave(candidateId, path)
      if (!result.success) {
        setError(result.error ?? "Dokument-Pfad konnte nicht gespeichert werden.")
        return
      }

      setSuccess(true)
      router.refresh()
    } catch {
      setError("Datei konnte nicht hochgeladen werden. Bitte versuche es erneut.")
    } finally {
      setUploading(false)
    }
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
        {success && (
          <Alert>
            <AlertDescription>Dokument erfolgreich hochgeladen.</AlertDescription>
          </Alert>
        )}
        {documentPath && downloadUrl ? (
          <p className="text-sm">
            <a href={downloadUrl} className="text-primary hover:underline" target="_blank" rel="noreferrer">
              Aktuelles Dokument herunterladen
            </a>
            {uploadedAt && (
              <span className="text-muted-foreground">
                {" "}
                (hochgeladen am {new Date(uploadedAt).toLocaleDateString("de-CH")})
              </span>
            )}
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
