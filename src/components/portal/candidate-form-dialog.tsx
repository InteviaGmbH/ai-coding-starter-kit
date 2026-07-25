"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
import { createCandidate, updateCandidate } from "@/app/internal/candidates/actions"

const formSchema = z.object({
  firstName: z.string().min(1, "Vorname ist erforderlich"),
  lastName: z.string().min(1, "Nachname ist erforderlich"),
  skills: z.string().optional(),
  region: z.string().optional(),
  availability: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

const emptyValues: FormValues = {
  firstName: "",
  lastName: "",
  skills: "",
  region: "",
  availability: "",
}

export interface CandidateFormDialogProps {
  mode: "create" | "edit"
  candidateId?: string
  defaultValues?: Partial<FormValues>
  trigger: React.ReactNode
}

export function CandidateFormDialog({
  mode,
  candidateId,
  defaultValues,
  trigger,
}: CandidateFormDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { ...emptyValues, ...defaultValues },
  })

  async function onSubmit(values: FormValues) {
    setError(null)
    setLoading(true)

    const result =
      mode === "create"
        ? await createCandidate(values)
        : await updateCandidate(candidateId!, values)

    setLoading(false)

    if (!result.success) {
      setError(result.error ?? "Speichern fehlgeschlagen.")
      return
    }

    setOpen(false)
    // Single shared dialog instance in "create" mode (see PROJ-3 lesson) —
    // reset to blank so the next "Neuer Kandidat" doesn't show stale data.
    form.reset(mode === "create" ? emptyValues : values)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Neuer Kandidat" : "Kandidat bearbeiten"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vorname</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nachname</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
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
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="region"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Region</FormLabel>
                    <FormControl>
                      <Input placeholder="z.B. Kanton Zürich" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="availability"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Verfügbarkeit</FormLabel>
                    <FormControl>
                      <Input placeholder="z.B. ab sofort" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {loading ? "Wird gespeichert…" : "Speichern"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
