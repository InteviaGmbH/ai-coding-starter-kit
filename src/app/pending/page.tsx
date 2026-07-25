import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getCurrentProfile, getPortalPathForProfile } from "@/lib/auth/get-current-profile"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LogoutButton } from "@/components/auth/logout-button"

export const metadata: Metadata = { title: "Konto ausstehend — Dafinex" }

export default async function PendingPage() {
  const profile = await getCurrentProfile()

  if (!profile) {
    redirect("/login")
  }

  if (profile.accountStatus !== "pending") {
    redirect(getPortalPathForProfile(profile))
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Konto wird geprüft</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Danke, {profile.fullName ?? profile.email}. Dein Konto wartet noch auf die Freischaltung
            durch Dafinex. Du erhältst eine Benachrichtigung, sobald du loslegen kannst.
          </p>
          <LogoutButton />
        </CardContent>
      </Card>
    </div>
  )
}
