"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
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
import { getExpiryStatus } from "@/lib/candidateDocuments/expiry"
import type { CandidateDocumentType } from "@/lib/candidateDocuments/schema"

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB
const ALLOWED_FILE_TYPES = ["application/pdf", "image/jpeg", "image/png"]

export interface DocumentVersionData {
  id: string
  uploadedAt: string
  expiryDate: string | null
  downloadUrl: string | null
}

export interface CandidateDocumentData {
  id: string
  name: string
  currentVersion: DocumentVersionData | null
  history: DocumentVersionData[]
}

interface SaveResult {
  success: boolean
  error?: string
  documentId?: string
}

interface Props {
  candidateId: string
  documentType: CandidateDocumentType
  document: CandidateDocumentData | null
  onSave: (input: {
    documentType: CandidateDocumentType
    name: string
    filePath: string
    expiryDate?: string
    documentId?: string
  }) => Promise<SaveResult>
  onArchive: (documentId: string) => Promise<{ success: boolean; error?: string }>
}

const expiryBadge: Record<"expiring_soon" | "expired", { label: string; variant: "secondary" | "destructive" }> = {
  expiring_soon: { label: "Läuft bald ab", variant: "secondary" },
  expired: { label: "Abgelaufen", variant: "destructive" },
}

export function CandidateDocumentSlot({
  candidateId,
  documentType,
  document,
  onSave,
  onArchive,
}: Props) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [expiryDate, setExpiryDate] = useState("")
  const [historyOpen, setHistoryOpen] = useState(false)

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
      // Every upload gets a fresh, unique path — versions are never
      // overwritten, so no upsert (and no dependency on a storage UPDATE
      // policy) is needed here.
      const path = `${candidateId}/${crypto.randomUUID()}-${file.name}`

      const { error: uploadError } = await supabase.storage
        .from("candidate-documents")
        .upload(path, file)

      if (uploadError) {
        const isTooLarge = /size|gross|large|payload/i.test(uploadError.message)
        setError(
          isTooLarge
            ? "Datei zu gross. Maximal 10 MB erlaubt."
            : "Datei konnte nicht hochgeladen werden. Bitte versuche es erneut."
        )
        return
      }

      const result = await onSave({
        documentType,
        name: document?.name ?? defaultNameFor(documentType),
        filePath: path,
        expiryDate: expiryDate || undefined,
        documentId: document?.id,
      })

      if (!result.success) {
        setError(result.error ?? "Dokument konnte nicht gespeichert werden.")
        return
      }

      setSuccess(true)
      setExpiryDate("")
      router.refresh()
    } catch {
      setError("Datei konnte nicht hochgeladen werden. Bitte versuche es erneut.")
    } finally {
      setUploading(false)
    }
  }

  async function handleArchive() {
    if (!document) return
    setError(null)
    const result = await onArchive(document.id)
    if (!result.success) {
      setError(result.error ?? "Dokument konnte nicht archiviert werden.")
      return
    }
    router.refresh()
  }

  const expiryStatus = document?.currentVersion
    ? getExpiryStatus(document.currentVersion.expiryDate)
    : "none"

  return (
    <div className="space-y-3 rounded-md border p-4">
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

      {document?.currentVersion ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <a
            href={document.currentVersion.downloadUrl ?? "#"}
            className="text-primary hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            Aktuelles Dokument herunterladen
          </a>
          <span className="text-muted-foreground">
            (hochgeladen am{" "}
            {new Date(document.currentVersion.uploadedAt).toLocaleDateString("de-CH")})
          </span>
          {(expiryStatus === "expiring_soon" || expiryStatus === "expired") && (
            <Badge variant={expiryBadge[expiryStatus].variant}>
              {expiryBadge[expiryStatus].label}
            </Badge>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Kein aktuelles Dokument.</p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 sm:items-end">
        <div>
          <Label>Datei hochladen{document?.currentVersion ? " (ersetzt aktuelle Version)" : ""}</Label>
          <Input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileChange}
            disabled={uploading}
          />
          <p className="mt-1 text-xs text-muted-foreground">PDF, JPG oder PNG, max. 10 MB.</p>
        </div>
        <div>
          <Label>Ablaufdatum (optional)</Label>
          <Input
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            disabled={uploading}
          />
        </div>
      </div>

      {document && document.history.length > 0 && (
        <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm">
              {historyOpen ? "Frühere Versionen ausblenden" : "Frühere Versionen anzeigen"} (
              {document.history.length})
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1 pt-2 text-sm">
            {document.history.map((v) => (
              <div key={v.id} className="flex items-center gap-2">
                <a
                  href={v.downloadUrl ?? "#"}
                  className="text-primary hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  Version vom {new Date(v.uploadedAt).toLocaleDateString("de-CH")}
                </a>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      {document?.currentVersion && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm">
              Archivieren
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Dokument archivieren?</AlertDialogTitle>
              <AlertDialogDescription>
                Dokument {document.name} wird aus der aktuellen Ansicht entfernt, bleibt aber im
                Abschnitt Frühere Versionen einsehbar. Dies kann nicht rückgängig gemacht werden.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction onClick={handleArchive}>Archivieren</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}

function defaultNameFor(documentType: CandidateDocumentType) {
  if (documentType === "cv") return "CV"
  if (documentType === "work_permit") return "Arbeitsbewilligung"
  return "Zertifikat"
}
