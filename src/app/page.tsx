import { redirect } from "next/navigation"
import { getCurrentProfile, getPortalPathForProfile } from "@/lib/auth/get-current-profile"

export default async function RootPage() {
  const profile = await getCurrentProfile()
  redirect(profile ? getPortalPathForProfile(profile) : "/login")
}
