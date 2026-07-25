import { redirect } from "next/navigation"
import { getCurrentProfile, getPortalPathForProfile, INTERNAL_ROLES } from "@/lib/auth/get-current-profile"
import { PortalShell, type PortalNavItem } from "@/components/portal/portal-shell"

const navItems: PortalNavItem[] = [
  { label: "Dashboard", href: "/internal/dashboard" },
  { label: "Freischaltungen", href: "/internal/approvals" },
]

export default async function InternalLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile()

  if (!profile) {
    redirect("/login")
  }

  if (!INTERNAL_ROLES.includes(profile.role) || profile.accountStatus !== "active") {
    redirect(getPortalPathForProfile(profile))
  }

  return (
    <PortalShell
      portalTitle="Interne Verwaltung"
      navItems={navItems}
      userLabel={profile.fullName ?? profile.email}
    >
      {children}
    </PortalShell>
  )
}
