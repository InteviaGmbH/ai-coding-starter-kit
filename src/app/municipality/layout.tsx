import { redirect } from "next/navigation"
import { getCurrentProfile, getPortalPathForProfile } from "@/lib/auth/get-current-profile"
import { PortalShell, type PortalNavItem } from "@/components/portal/portal-shell"
import { getRecentNotifications } from "@/lib/notifications/get-recent-notifications"

const navItems: PortalNavItem[] = [
  { label: "Dashboard", href: "/municipality/dashboard" },
  { label: "Anfragen", href: "/municipality/requests" },
  { label: "Einsätze", href: "/municipality/assignments" },
]

export default async function MunicipalityLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile()

  if (!profile) {
    redirect("/login")
  }

  if (profile.role !== "municipality" || profile.accountStatus !== "active") {
    redirect(getPortalPathForProfile(profile))
  }

  const notifications = await getRecentNotifications(profile.id)

  return (
    <PortalShell
      portalTitle="Gemeindeportal"
      navItems={navItems}
      userLabel={profile.fullName ?? profile.email}
      notifications={notifications}
    >
      {children}
    </PortalShell>
  )
}
