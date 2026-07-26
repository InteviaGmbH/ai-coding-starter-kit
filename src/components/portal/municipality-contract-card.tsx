import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export interface MunicipalityContractCardProps {
  contract: { status: "generated" | "signed" } | null
  generatedDownloadUrl: string | null
  signedDownloadUrl: string | null
}

const statusLabel: Record<"generated" | "signed", string> = {
  generated: "Generiert",
  signed: "Unterschrieben",
}

export function MunicipalityContractCard({
  contract,
  generatedDownloadUrl,
  signedDownloadUrl,
}: MunicipalityContractCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Vertrag</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!contract ? (
          <p className="text-sm text-muted-foreground">Noch kein Vertrag bereit.</p>
        ) : (
          <>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
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
                  Vertragsdokument herunterladen
                </a>
              </p>
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
      </CardContent>
    </Card>
  )
}
