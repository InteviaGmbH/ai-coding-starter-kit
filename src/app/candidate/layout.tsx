import { redirect } from "next/navigation"
import { getCurrentProfile, getPortalPathForProfile } from "@/lib/auth/get-current-profile"
import { PortalShell, type PortalNavItem } from "@/components/portal/portal-shell"

const navItems: PortalNavItem[] = [{ label: "Dashboard", href: "/candidate/dashboard" }]

export default async function CandidateLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile()

  if (!profile) {
    redirect("/login")
  }

  if (profile.role !== "candidate" || profile.accountStatus !== "active") {
    redirect(getPortalPathForProfile(profile))
  }

  return (
    <PortalShell
      portalTitle="Kandidatenportal"
      navItems={navItems}
      userLabel={profile.fullName ?? profile.email}
    >
      {children}
    </PortalShell>
  )
}
