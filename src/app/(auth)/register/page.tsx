import type { Metadata } from "next"
import Link from "next/link"
import { RegisterRoleToggle } from "@/components/auth/register-role-toggle"

export const metadata: Metadata = { title: "Registrieren — Dafinex" }

export default function RegisterPage() {
  return (
    <div className="space-y-4">
      <RegisterRoleToggle />
      <p className="text-center text-sm text-muted-foreground">
        Bereits registriert?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Zum Login
        </Link>
      </p>
    </div>
  )
}
