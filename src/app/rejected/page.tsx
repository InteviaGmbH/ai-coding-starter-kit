import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getCurrentProfile, getPortalPathForProfile } from "@/lib/auth/get-current-profile"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LogoutButton } from "@/components/auth/logout-button"

export const metadata: Metadata = { title: "Konto abgelehnt — Dafinex" }

export default async function RejectedPage() {
  const profile = await getCurrentProfile()

  if (!profile) {
    redirect("/login")
  }

  if (profile.accountStatus !== "rejected") {
    redirect(getPortalPathForProfile(profile))
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Registrierung abgelehnt</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Dein Konto wurde von Dafinex nicht freigeschaltet. Bei Fragen wende dich bitte
            direkt an Dafinex.
          </p>
          <LogoutButton />
        </CardContent>
      </Card>
    </div>
  )
}
