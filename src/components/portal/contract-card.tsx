"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createContract, setSignedDocument } from "@/app/internal/contracts/actions"

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB
const ALLOWED_FILE_TYPES = ["application/pdf", "image/jpeg", "image/png"]

export interface ContractCardProps {
  assignmentId: string
  assignmentStatus: "proposed" | "accepted" | "active" | "completed"
  contract: { id: string; status: "generated" | "signed" } | null
  generatedDownloadUrl: string | null
  signedDownloadUrl: string | null
}

const statusLabel: Record<"generated" | "signed", string> = {
  generated: "Generiert",
  signed: "Unterschrieben",
}

export function ContractCard({
  assignmentId,
  assignmentStatus,
  contract,
  generatedDownloadUrl,
  signedDownloadUrl,
}: ContractCardProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  async function uploadFile(file: File, kind: "generated" | "signed") {
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      setError("Nur PDF, JPG oder PNG erlaubt.")
      return
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError("Datei darf maximal 10 MB gross sein.")
      return
    }

    setError(null)
    setUploading(true)
    const supabase = createClient()
    const path = `${assignmentId}/${kind}-${file.name}`

    const { error: uploadError } = await supabase.storage
      .from("contracts")
      .upload(path, file, { upsert: true })

    if (uploadError) {
      setUploading(false)
      setError("Datei konnte nicht hochgeladen werden.")
      return
    }

    const result =
      kind === "generated"
        ? await createContract(assignmentId, path)
        : await setSignedDocument(contract!.id, path)

    setUploading(false)

    if (!result.success) {
      setError(result.error ?? "Speichern fehlgeschlagen.")
      return
    }

    router.refresh()
  }

  function handleFileChange(kind: "generated" | "signed") {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      e.target.value = ""
      if (!file) return
      uploadFile(file, kind)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vertrag</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!contract ? (
          assignmentStatus === "proposed" ? (
            <p className="text-sm text-muted-foreground">
              Der Einsatz muss zuerst mindestens den Status „Akzeptiert" erreichen, bevor ein
              Vertrag angelegt werden kann.
            </p>
          ) : (
            <div>
              <p className="mb-2 text-sm text-muted-foreground">Noch kein Vertrag angelegt.</p>
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange("generated")}
                disabled={uploading}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Generiertes Vertragsdokument hochladen (PDF, JPG oder PNG, max. 10 MB).
              </p>
            </div>
          )
        ) : (
          <>
            <div>
              <p className="text-muted-foreground text-sm">Status</p>
              <Badge>{statusLabel[contract.status]}</Badge>
            </div>
            {generatedDownloadUrl && (
              <p className="text-sm">
                <a
                  href={generatedDownloadUrl}
                  className="text-primary hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  Generiertes Dokument herunterladen
                </a>
              </p>
            )}
            {contract.status === "generated" && (
              <div>
                <Input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange("signed")}
                  disabled={uploading}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Unterschriebene Version hochladen (PDF, JPG oder PNG, max. 10 MB).
                </p>
              </div>
            )}
            {signedDownloadUrl && (
              <p className="text-sm">
                <a
                  href={signedDownloadUrl}
                  className="text-primary hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  Unterschriebene Version herunterladen
                </a>
              </p>
            )}
          </>
        )}

        {uploading && <Button disabled>Wird hochgeladen…</Button>}
      </CardContent>
    </Card>
  )
}
