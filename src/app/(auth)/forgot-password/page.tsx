import type { Metadata } from "next"
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"

export const metadata: Metadata = { title: "Passwort vergessen — Dafinex" }

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />
}
