"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
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

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB
const ALLOWED_FILE_TYPES = ["application/pdf", "image/jpeg", "image/png"]

const candidateSchema = z
  .object({
    firstName: z.string().min(1, "Bitte Vornamen angeben"),
    lastName: z.string().min(1, "Bitte Nachnamen angeben"),
    email: z.string().email("Bitte eine gültige E-Mail-Adresse eingeben"),
    password: z.string().min(8, "Mindestens 8 Zeichen"),
    passwordConfirm: z.string(),
    skills: z.string().min(1, "Bitte mindestens eine Fähigkeit angeben"),
    region: z.string().min(1, "Bitte Region angeben"),
    availability: z.string().min(1, "Bitte Verfügbarkeit angeben"),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Passwörter stimmen nicht überein",
    path: ["passwordConfirm"],
  })

type CandidateValues = z.infer<typeof candidateSchema>

export function CandidateRegisterForm() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)

  const form = useForm<CandidateValues>({
    resolver: zodResolver(candidateSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      passwordConfirm: "",
      skills: "",
      region: "",
      availability: "",
    },
  })

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setFileError(null)

    if (!file) {
      setCvFile(null)
      return
    }

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      setFileError("Nur PDF, JPG oder PNG erlaubt.")
      setCvFile(null)
      return
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setFileError("Datei darf maximal 10 MB gross sein.")
      setCvFile(null)
      return
    }

    setCvFile(file)
  }

  async function onSubmit(values: CandidateValues) {
    setError(null)
    setLoading(true)

    const supabase = createClient()

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          role: "candidate",
          full_name: `${values.firstName} ${values.lastName}`,
        },
      },
    })

    if (signUpError || !signUpData.user) {
      setError(
        signUpError?.message.toLowerCase().includes("already")
          ? "Diese E-Mail-Adresse ist bereits registriert."
          : "Registrierung fehlgeschlagen. Bitte versuche es erneut."
      )
      setLoading(false)
      return
    }

    const skillsArray = values.skills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)

    // Generate the id client-side and skip .select() (no RETURNING): with
    // RETURNING, Postgres re-checks the row against candidates_select
    // ("is_internal_role() or id = current_candidate_id()"), and
    // current_candidate_id() is still NULL at this point — the
    // link_candidate_profile trigger that sets it hasn't run yet from the
    // perspective of that check — so the insert was spuriously rejected as
    // an RLS violation even though the INSERT policy itself was satisfied.
    const candidateId = crypto.randomUUID()
    const { error: candidateError } = await supabase.from("candidates").insert({
      id: candidateId,
      profile_id: signUpData.user.id,
      first_name: values.firstName,
      last_name: values.lastName,
      skills: skillsArray,
      region: values.region,
      availability: values.availability,
      source_type: "dafinex",
    })

    if (candidateError) {
      setError(
        "Konto wurde erstellt, aber dein Profil konnte nicht gespeichert werden. Bitte kontaktiere Dafinex."
      )
      setLoading(false)
      return
    }

    if (cvFile) {
      // Unique per-upload path (PROJ-16 versioning) rather than a fixed
      // per-candidate path — every version gets its own file, never
      // overwritten.
      const path = `${candidateId}/${crypto.randomUUID()}-${cvFile.name}`
      const { error: uploadError } = await supabase.storage
        .from("candidate-documents")
        .upload(path, cvFile)

      if (uploadError) {
        // Registration itself succeeded — the document can be uploaded later.
        setError(
          "Profil wurde gespeichert, das Dokument konnte aber nicht hochgeladen werden. Du kannst es später erneut versuchen."
        )
      } else {
        const { error: rpcError } = await supabase.rpc("save_candidate_document_version", {
          p_candidate_id: candidateId,
          p_document_type: "cv",
          p_name: "CV",
          p_file_path: path,
          p_expiry_date: null,
          p_document_id: null,
        })
        if (rpcError) {
          setError(
            "Profil wurde gespeichert, das Dokument konnte aber nicht gespeichert werden. Du kannst es später erneut versuchen."
          )
        }
      }
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
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vorname</FormLabel>
                <FormControl>
                  <Input autoComplete="given-name" {...field} />
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
                  <Input autoComplete="family-name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
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
        <div className="grid grid-cols-2 gap-4">
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
        <div className="space-y-2">
          <Label htmlFor="cv">CV / Zertifikat (optional)</Label>
          <Input id="cv" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} />
          <p className="text-sm text-muted-foreground">PDF, JPG oder PNG, max. 10 MB</p>
          {fileError && <p className="text-sm font-medium text-destructive">{fileError}</p>}
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Wird registriert…" : "Als Kandidat registrieren"}
        </Button>
      </form>
    </Form>
  )
}
