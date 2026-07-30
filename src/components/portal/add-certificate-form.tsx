"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB
const ALLOWED_FILE_TYPES = ["application/pdf", "image/jpeg", "image/png"]

interface SaveResult {
  success: boolean
  error?: string
  documentId?: string
}

interface Props {
  candidateId: string
  onSave: (input: {
    documentType: "certificate"
    name: string
    filePath: string
    expiryDate?: string
  }) => Promise<SaveResult>
}

export function AddCertificateForm({ candidateId, onSave }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [expiryDate, setExpiryDate] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function reset() {
    setName("")
    setExpiryDate("")
    setFile(null)
    setError(null)
  }

  async function handleSubmit() {
    setError(null)

    if (!name.trim()) {
      setError("Name ist erforderlich.")
      return
    }
    if (!file) {
      setError("Bitte eine Datei auswählen.")
      return
    }
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      setError("Nur PDF, JPG oder PNG erlaubt.")
      return
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError("Datei darf maximal 10 MB gross sein.")
      return
    }

    setSaving(true)

    try {
      const supabase = createClient()
      const path = `${candidateId}/${crypto.randomUUID()}-${file.name}`

      const { error: uploadError } = await supabase.storage
        .from("candidate-documents")
        .upload(path, file)

      if (uploadError) {
        setError("Datei konnte nicht hochgeladen werden. Bitte versuche es erneut.")
        return
      }

      const result = await onSave({
        documentType: "certificate",
        name: name.trim(),
        filePath: path,
        expiryDate: expiryDate || undefined,
      })

      if (!result.success) {
        setError(result.error ?? "Zertifikat konnte nicht gespeichert werden.")
        return
      }

      reset()
      setOpen(false)
      router.refresh()
    } catch {
      setError("Datei konnte nicht hochgeladen werden. Bitte versuche es erneut.")
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        + Neues Zertifikat
      </Button>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Neues Zertifikat</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div>
          <Label>Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z.B. SVEB-Zertifikat"
            disabled={saving}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Datei</Label>
            <Input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              disabled={saving}
            />
          </div>
          <div>
            <Label>Ablaufdatum (optional)</Label>
            <Input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              disabled={saving}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Wird gespeichert…" : "Speichern"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              reset()
              setOpen(false)
            }}
            disabled={saving}
          >
            Abbrechen
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
