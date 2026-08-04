"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createPartnerCompany, updatePartnerCompany } from "@/app/internal/partners/actions"

const companyFieldsSchema = z.object({
  name: z.string().min(1, "Name ist erforderlich"),
  address: z.string().optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().email("Ungültige E-Mail-Adresse").optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  commissionRate: z.string().optional(),
})

// Only "create" needs the first-account fields — editing an existing
// company never touches its linked accounts (see the "no self-edit" scope
// decision: an existing account isn't recreated or reassigned here).
const createFormSchema = companyFieldsSchema.extend({
  firstUserEmail: z.string().email("Ungültige E-Mail-Adresse"),
  firstUserFullName: z.string().min(1, "Name des Ansprechpartners ist erforderlich"),
})

type FormValues = z.infer<typeof createFormSchema>

export interface PartnerCompanyFormDialogProps {
  mode: "create" | "edit"
  partnerCompanyId?: string
  defaultValues?: Partial<FormValues>
  trigger: React.ReactNode
}

export function PartnerCompanyFormDialog({
  mode,
  partnerCompanyId,
  defaultValues,
  trigger,
}: PartnerCompanyFormDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // In "edit" mode the first-account fields aren't rendered, but they stay
  // registered on FormValues (with blank defaults) — validating them against
  // createFormSchema would fail; companyFieldsSchema.safeParse simply strips
  // and ignores them instead, same as the server-side updatePartnerCompany
  // action does with a payload that (harmlessly) still includes them.
  const resolver = (
    mode === "create" ? zodResolver(createFormSchema) : zodResolver(companyFieldsSchema)
  ) as Resolver<FormValues>

  const form = useForm<FormValues>({
    resolver,
    defaultValues: {
      name: defaultValues?.name ?? "",
      address: defaultValues?.address ?? "",
      contactName: defaultValues?.contactName ?? "",
      contactEmail: defaultValues?.contactEmail ?? "",
      contactPhone: defaultValues?.contactPhone ?? "",
      commissionRate: defaultValues?.commissionRate ?? "",
      firstUserEmail: "",
      firstUserFullName: "",
    },
  })

  async function onSubmit(values: FormValues) {
    setError(null)
    setLoading(true)

    const commissionRate = values.commissionRate?.trim() ? Number(values.commissionRate) : null

    const result =
      mode === "create"
        ? await createPartnerCompany({ ...values, commissionRate })
        : await updatePartnerCompany(partnerCompanyId!, { ...values, commissionRate })

    setLoading(false)

    if (!result.success) {
      setError(result.error ?? "Speichern fehlgeschlagen.")
      return
    }

    setOpen(false)
    // Same reasoning as MunicipalityFormDialog: this is a single shared
    // dialog instance in "create" mode, reset to blank so the next "Neue
    // Partnerfirma" doesn't pre-fill with the previous submission.
    form.reset(
      mode === "create"
        ? {
            name: "",
            address: "",
            contactName: "",
            contactEmail: "",
            contactPhone: "",
            commissionRate: "",
            firstUserEmail: "",
            firstUserFullName: "",
          }
        : values
    )
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Neue Partnerfirma" : "Partnerfirma bearbeiten"}</DialogTitle>
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
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adresse</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contactName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ansprechpartner (Name)</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="contactEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kontakt-E-Mail</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contactPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefon</FormLabel>
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
              name="commissionRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Provision (%)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0" max="100" {...field} />
                  </FormControl>
                  <FormDescription>Nur für internes Personal sichtbar, nie für die Partnerfirma selbst.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            {mode === "create" && (
              <>
                <div className="border-t pt-4">
                  <p className="text-sm font-medium">Erstes Nutzerkonto</p>
                  <p className="text-sm text-muted-foreground">
                    Wird sofort aktiv angelegt — kein Freischaltungs-Workflow.
                  </p>
                </div>
                <FormField
                  control={form.control}
                  name="firstUserFullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="firstUserEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-Mail (Login)</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
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
