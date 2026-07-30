import { z } from "zod"

export const candidateDocumentTypeSchema = z.enum(["cv", "certificate", "work_permit"])
export type CandidateDocumentType = z.infer<typeof candidateDocumentTypeSchema>

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export const saveDocumentVersionSchema = z
  .object({
    documentType: candidateDocumentTypeSchema,
    name: z.string().trim().min(1, "Name ist erforderlich"),
    filePath: z.string().trim().min(1, "Ungültiger Dateipfad"),
    expiryDate: z.string().trim().optional(),
    documentId: z.string().uuid().optional(),
  })
  .refine((data) => !data.expiryDate || data.expiryDate >= todayIso(), {
    message: "Ablaufdatum darf nicht in der Vergangenheit liegen",
    path: ["expiryDate"],
  })

export type SaveDocumentVersionInput = z.infer<typeof saveDocumentVersionSchema>
