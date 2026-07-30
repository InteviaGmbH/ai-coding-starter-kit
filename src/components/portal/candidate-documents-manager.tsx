"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  CandidateDocumentSlot,
  type CandidateDocumentData,
} from "@/components/portal/candidate-document-slot"
import { AddCertificateForm } from "@/components/portal/add-certificate-form"
import {
  CandidateArchivedDocuments,
  type ArchivedDocumentData,
} from "@/components/portal/candidate-archived-documents"
import type { CandidateDocumentType } from "@/lib/candidateDocuments/schema"

interface SaveResult {
  success: boolean
  error?: string
  documentId?: string
}

interface SaveInput {
  documentType: CandidateDocumentType
  name: string
  filePath: string
  expiryDate?: string
  documentId?: string
}

interface Props {
  candidateId: string
  cv: CandidateDocumentData | null
  workPermit: CandidateDocumentData | null
  certificates: CandidateDocumentData[]
  archivedDocuments: ArchivedDocumentData[]
  onSave: (input: SaveInput) => Promise<SaveResult>
  onArchive: (documentId: string) => Promise<{ success: boolean; error?: string }>
}

export function CandidateDocumentsManager({
  candidateId,
  cv,
  workPermit,
  certificates,
  archivedDocuments,
  onSave,
  onArchive,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Dokumente</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="mb-2 text-sm font-medium">CV</h3>
          <CandidateDocumentSlot
            candidateId={candidateId}
            documentType="cv"
            document={cv}
            onSave={onSave}
            onArchive={onArchive}
          />
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium">Arbeitsbewilligung</h3>
          <CandidateDocumentSlot
            candidateId={candidateId}
            documentType="work_permit"
            document={workPermit}
            onSave={onSave}
            onArchive={onArchive}
          />
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium">Zertifikate</h3>
          <div className="space-y-3">
            {certificates.length === 0 && (
              <p className="text-sm text-muted-foreground">Noch keine Zertifikate hinterlegt.</p>
            )}
            {certificates.map((cert) => (
              <div key={cert.id}>
                <p className="mb-1 text-sm text-muted-foreground">{cert.name}</p>
                <CandidateDocumentSlot
                  candidateId={candidateId}
                  documentType="certificate"
                  document={cert}
                  onSave={onSave}
                  onArchive={onArchive}
                />
              </div>
            ))}
            <AddCertificateForm candidateId={candidateId} onSave={onSave} />
          </div>
        </div>

        <CandidateArchivedDocuments documents={archivedDocuments} />
      </CardContent>
    </Card>
  )
}
