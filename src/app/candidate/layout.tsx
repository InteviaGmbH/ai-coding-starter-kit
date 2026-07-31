import { redirect } from "next/navigation"
import { getCurrentProfile, getPortalPathForProfile } from "@/lib/auth/get-current-profile"
import { PortalShell, type PortalNavItem } from "@/components/portal/portal-shell"
import { getRecentNotifications } from "@/lib/notifications/get-recent-notifications"

const navItems: PortalNavItem[] = [
  { label: "Dashboard", href: "/candidate/dashboard" },
  { label: "Profil", href: "/candidate/profile" },
  { label: "Einsätze", href: "/candidate/assignments" },
]

export default async function CandidateLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile()

  if (!profile) {
    redirect("/login")
  }

  if (profile.role !== "candidate" || profile.accountStatus !== "active") {
    redirect(getPortalPathForProfile(profile))
  }

  const notifications = await getRecentNotifications(profile.id)

  return (
    <PortalShell
      portalTitle="Kandidatenportal"
      navItems={navItems}
      userLabel={profile.fullName ?? profile.email}
      notifications={notifications}
      notificationsHref="/candidate/notifications"
    >
      {children}
    </PortalShell>
  )
}
