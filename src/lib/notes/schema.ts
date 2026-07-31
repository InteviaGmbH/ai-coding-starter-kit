import { z } from "zod"

export const noteEntityTypeSchema = z.enum(["candidate", "request", "assignment"])
export type NoteEntityType = z.infer<typeof noteEntityTypeSchema>

export const addNoteSchema = z.object({
  content: z.string().trim().min(1, "Notiztext ist erforderlich").max(2000),
})
export type AddNoteInput = z.infer<typeof addNoteSchema>
