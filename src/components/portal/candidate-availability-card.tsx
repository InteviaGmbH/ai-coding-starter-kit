"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  updateCandidateAvailability,
  type CandidateAvailabilityInput,
} from "@/app/candidate/profile/actions"

const formSchema = z
  .object({
    maxWorkloadPercent: z
      .string()
      .optional()
      .refine((v) => !v || (Number.isInteger(Number(v)) && Number(v) >= 0 && Number(v) <= 100), {
        message: "Pensum muss zwischen 0 und 100 liegen",
      }),
    availabilityStart: z.string().optional(),
    availabilityEnd: z.string().optional(),
  })
  .refine(
    (data) =>
      !data.availabilityStart || !data.availabilityEnd || data.availabilityEnd >= data.availabilityStart,
    { message: "Verfügbar bis darf nicht vor Verfügbar von liegen", path: ["availabilityEnd"] }
  )

type FormValues = z.infer<typeof formSchema>

export function CandidateAvailabilityCard({ defaultValues }: { defaultValues: FormValues }) {
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

    const result = await updateCandidateAvailability(values as CandidateAvailabilityInput)
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
        <CardTitle>Verfügbarkeit</CardTitle>
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
              name="maxWorkloadPercent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pensum (%)</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} max={100} placeholder="z.B. 80" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="availabilityStart"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Verfügbar von</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="availabilityEnd"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Verfügbar bis</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
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
