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
import {
  createPersonnelRequest,
  updatePersonnelRequest,
} from "@/app/municipality/requests/actions"

const formSchema = z
  .object({
    title: z.string().min(1, "Titel/Rolle ist erforderlich"),
    requiredSkills: z.string().optional(),
    region: z.string().optional(),
    startDate: z.string().min(1, "Startdatum ist erforderlich"),
    endDate: z.string().optional(),
  })
  .refine((data) => !data.endDate || data.endDate >= data.startDate, {
    message: "Enddatum darf nicht vor dem Startdatum liegen",
    path: ["endDate"],
  })

type FormValues = z.infer<typeof formSchema>

const emptyValues: FormValues = {
  title: "",
  requiredSkills: "",
  region: "",
  startDate: "",
  endDate: "",
}

export interface PersonnelRequestFormDialogProps {
  mode: "create" | "edit"
  requestId?: string
  defaultValues?: Partial<FormValues>
  trigger: React.ReactNode
}

export function PersonnelRequestFormDialog({
  mode,
  requestId,
  defaultValues,
  trigger,
}: PersonnelRequestFormDialogProps) {
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
        ? await createPersonnelRequest(values)
        : await updatePersonnelRequest(requestId!, values)

    setLoading(false)

    if (!result.success) {
      setError(result.error ?? "Speichern fehlgeschlagen.")
      return
    }

    setOpen(false)
    form.reset(mode === "create" ? emptyValues : values)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Neue Anfrage" : "Anfrage bearbeiten"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titel / gesuchte Rolle</FormLabel>
                  <FormControl>
                    <Input placeholder="z.B. Sozialarbeiter:in 60%" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="requiredSkills"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Benötigte Fähigkeiten</FormLabel>
                  <FormControl>
                    <Textarea placeholder="z.B. Sozialarbeit, Deutschkenntnisse" {...field} />
                  </FormControl>
                  <FormDescription>Mit Komma trennen</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
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
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ende (optional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
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
