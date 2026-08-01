import { z } from "zod"

export const partyTypeSchema = z.enum(["dafinex", "municipality", "candidate"])
export type PartyType = z.infer<typeof partyTypeSchema>

export const signDigitalSchema = z.object({
  signerName: z.string().trim().min(1, "Name ist erforderlich"),
  agreed: z.literal(true, { message: "Zustimmung ist erforderlich" }),
})
export type SignDigitalInput = z.infer<typeof signDigitalSchema>
