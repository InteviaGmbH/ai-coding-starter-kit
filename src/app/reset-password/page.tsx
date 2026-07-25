import type { Metadata } from "next"
import { ResetPasswordForm } from "@/components/auth/reset-password-form"

export const metadata: Metadata = { title: "Neues Passwort — Dafinex" }

// Deliberately outside the (auth) route group: Supabase's password-recovery
// link signs the user in with a temporary session, and the (auth) layout's
// guard would otherwise redirect an already-authenticated user straight to
// their portal before they get a chance to set a new password.
export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-primary">Dafinex</h1>
        </div>
        <ResetPasswordForm />
      </div>
    </div>
  )
}
