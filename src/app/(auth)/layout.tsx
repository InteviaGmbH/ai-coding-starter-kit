import { redirect } from "next/navigation"
import { getCurrentProfile, getPortalPathForProfile } from "@/lib/auth/get-current-profile"

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const profile = await getCurrentProfile()

  if (profile) {
    redirect(getPortalPathForProfile(profile))
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-primary">Dafinex</h1>
          <p className="text-sm text-muted-foreground">Vermittlungs- und Einsatzplattform</p>
        </div>
        {children}
      </div>
    </div>
  )
}
