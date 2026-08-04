import { redirect } from "next/navigation"
import { getCurrentProfile, getPortalPathForProfile } from "@/lib/auth/get-current-profile"
import { PortalShell, type PortalNavItem } from "@/components/portal/portal-shell"
import { getRecentNotifications } from "@/lib/notifications/get-recent-notifications"

const navItems: PortalNavItem[] = [
  { label: "Dashboard", href: "/partner/dashboard" },
  { label: "Kandidaten", href: "/partner/candidates" },
  { label: "Anfragen", href: "/partner/requests" },
]

export default async function PartnerLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile()

  if (!profile) {
    redirect("/login")
  }

  if (profile.role !== "partner_company" || profile.accountStatus !== "active") {
    redirect(getPortalPathForProfile(profile))
  }

  const notifications = await getRecentNotifications(profile.id)

  return (
    <PortalShell
      portalTitle="Partnerportal"
      navItems={navItems}
      userLabel={profile.fullName ?? profile.email}
      notifications={notifications}
      notificationsHref="/partner/dashboard"
    >
      {children}
    </PortalShell>
  )
}
