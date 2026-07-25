import { redirect } from "next/navigation"
import { getCurrentProfile, getPortalPathForProfile } from "@/lib/auth/get-current-profile"
import { PortalShell, type PortalNavItem } from "@/components/portal/portal-shell"

const navItems: PortalNavItem[] = [
  { label: "Dashboard", href: "/municipality/dashboard" },
  { label: "Anfragen", href: "/municipality/requests" },
]

export default async function MunicipalityLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile()

  if (!profile) {
    redirect("/login")
  }

  if (profile.role !== "municipality" || profile.accountStatus !== "active") {
    redirect(getPortalPathForProfile(profile))
  }

  return (
    <PortalShell
      portalTitle="Gemeindeportal"
      navItems={navItems}
      userLabel={profile.fullName ?? profile.email}
    >
      {children}
    </PortalShell>
  )
}
