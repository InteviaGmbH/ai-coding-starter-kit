"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import type { CandidateDocumentType } from "@/lib/candidateDocuments/schema"
import type { DocumentVersionData } from "@/components/portal/candidate-document-slot"

export interface ArchivedDocumentData {
  id: string
  documentType: CandidateDocumentType
  name: string
  versions: DocumentVersionData[]
}

const typeLabel: Record<CandidateDocumentType, string> = {
  cv: "CV",
  certificate: "Zertifikat",
  work_permit: "Arbeitsbewilligung",
}

export function CandidateArchivedDocuments({ documents }: { documents: ArchivedDocumentData[] }) {
  const [open, setOpen] = useState(false)

  if (documents.length === 0) return null

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm">
          {open ? "Archivierte Dokumente ausblenden" : "Archivierte Dokumente anzeigen"} (
          {documents.length})
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 pt-3">
        {documents.map((doc) => (
          <div key={doc.id} className="rounded-md border border-dashed p-3 text-sm">
            <div className="mb-1 flex items-center gap-2">
              <Badge variant="secondary">{typeLabel[doc.documentType]}</Badge>
              <span className="font-medium">{doc.name}</span>
            </div>
            {doc.versions.length === 0 ? (
              <p className="text-muted-foreground">Keine Datei-Version vorhanden.</p>
            ) : (
              <ul className="space-y-1">
                {doc.versions.map((v) => (
                  <li key={v.id}>
                    <a
                      href={v.downloadUrl ?? "#"}
                      className="text-primary hover:underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Version vom {new Date(v.uploadedAt).toLocaleDateString("de-CH")}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  )
}
