"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  updateCandidateQualifications,
  type CandidateQualificationsInput,
} from "@/app/candidate/profile/actions"

const formSchema = z.object({
  skills: z.string().optional(),
  certifications: z.string().optional(),
  languages: z.string().optional(),
  experienceYears: z
    .string()
    .optional()
    .refine((v) => !v || (Number.isInteger(Number(v)) && Number(v) >= 0), {
      message: "Berufserfahrung darf nicht negativ sein",
    }),
  preferredRegions: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

export function CandidateQualificationsCard({ defaultValues }: { defaultValues: FormValues }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  })

  async function onSubmit(values: FormValues) {
    setError(null)
    setLoading(true)

    const result = await updateCandidateQualifications(values as CandidateQualificationsInput)
    setLoading(false)

    if (!result.success) {
      setError(result.error ?? "Speichern fehlgeschlagen.")
      return
    }

    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fähigkeiten & Qualifikationen</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <FormField
              control={form.control}
              name="skills"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fähigkeiten</FormLabel>
                  <FormControl>
                    <Textarea placeholder="z.B. Sozialarbeit, Pflege, Administration" {...field} />
                  </FormControl>
                  <FormDescription>Mit Komma trennen</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="certifications"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Zertifikate</FormLabel>
                  <FormControl>
                    <Textarea placeholder="z.B. Berufsmatura, SVEB-Zertifikat" {...field} />
                  </FormControl>
                  <FormDescription>Mit Komma trennen</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="languages"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sprachen</FormLabel>
                  <FormControl>
                    <Input placeholder="z.B. Deutsch, Französisch, Englisch" {...field} />
                  </FormControl>
                  <FormDescription>Mit Komma trennen</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="experienceYears"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Berufserfahrung (Jahre)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="preferredRegions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bevorzugte Regionen</FormLabel>
                    <FormControl>
                      <Input placeholder="z.B. Kanton Zürich, Kanton Aargau" {...field} />
                    </FormControl>
                    <FormDescription>Mit Komma trennen</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? "Wird gespeichert…" : "Speichern"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
