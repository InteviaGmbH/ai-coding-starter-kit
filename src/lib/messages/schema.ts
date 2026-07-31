import { z } from "zod"

export const messageTypeSchema = z.enum([
  "request",
  "assignment",
  "general_candidate",
  "general_municipality",
])
export type MessageType = z.infer<typeof messageTypeSchema>

export const sendMessageSchema = z.object({
  subject: z.string().trim().max(200).optional(),
  content: z.string().trim().min(1, "Inhalt ist erforderlich").max(5000),
})
export type SendMessageInput = z.infer<typeof sendMessageSchema>
