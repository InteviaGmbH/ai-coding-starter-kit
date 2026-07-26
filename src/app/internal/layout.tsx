import { redirect } from "next/navigation"
import { getCurrentProfile, getPortalPathForProfile, INTERNAL_ROLES } from "@/lib/auth/get-current-profile"
import { PortalShell, type PortalNavItem } from "@/components/portal/portal-shell"
import { getRecentNotifications } from "@/lib/notifications/get-recent-notifications"

const navItems: PortalNavItem[] = [
  { label: "Dashboard", href: "/internal/dashboard" },
  { label: "Gemeinden", href: "/internal/municipalities" },
  { label: "Kandidaten", href: "/internal/candidates" },
  { label: "Anfragen", href: "/internal/requests" },
  { label: "Einsätze", href: "/internal/assignments" },
  { label: "Aktivitäten", href: "/internal/activity" },
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

  const notifications = await getRecentNotifications(profile.id)

  return (
    <PortalShell
      portalTitle="Interne Verwaltung"
      navItems={navItems}
      userLabel={profile.fullName ?? profile.email}
      notifications={notifications}
    >
      {children}
    </PortalShell>
  )
}
