"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Alert, AlertDescription } from "@/components/ui/alert"

const municipalitySchema = z
  .object({
    fullName: z.string().min(2, "Bitte Namen angeben"),
    contactPhone: z.string().min(1, "Bitte Telefonnummer angeben"),
    email: z.string().email("Bitte eine gültige E-Mail-Adresse eingeben"),
    password: z.string().min(8, "Mindestens 8 Zeichen"),
    passwordConfirm: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Passwörter stimmen nicht überein",
    path: ["passwordConfirm"],
  })

type MunicipalityValues = z.infer<typeof municipalitySchema>

export function MunicipalityRegisterForm() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const form = useForm<MunicipalityValues>({
    resolver: zodResolver(municipalitySchema),
    defaultValues: { fullName: "", contactPhone: "", email: "", password: "", passwordConfirm: "" },
  })

  async function onSubmit(values: MunicipalityValues) {
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error: signUpError } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          role: "municipality",
          full_name: values.fullName,
          contact_phone: values.contactPhone,
        },
      },
    })

    if (signUpError) {
      setError(
        signUpError.message.toLowerCase().includes("already")
          ? "Diese E-Mail-Adresse ist bereits registriert."
          : "Registrierung fehlgeschlagen. Bitte versuche es erneut."
      )
      setLoading(false)
      return
    }

    setLoading(false)
    setDone(true)
  }

  if (done) {
    return (
      <Alert>
        <AlertDescription>
          Danke für deine Registrierung! Dein Konto wird von Dafinex geprüft und freigeschaltet.
          Du erhältst eine Benachrichtigung, sobald du dich einloggen kannst.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input autoComplete="name" {...field} />
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
              <FormLabel>Telefonnummer</FormLabel>
              <FormControl>
                <Input type="tel" autoComplete="tel" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-Mail</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Passwort</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="passwordConfirm"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Passwort bestätigen</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Wird registriert…" : "Als Gemeinde registrieren"}
        </Button>
      </form>
    </Form>
  )
}
