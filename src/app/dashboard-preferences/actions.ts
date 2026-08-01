"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getCurrentProfile } from "@/lib/auth/get-current-profile"

interface ActionResult {
  success: boolean
  error?: string
}

const schema = z.object({ hidden: z.array(z.string()) })

export async function updateHiddenDashboardWidgets(hidden: string[]): Promise<ActionResult> {
  const profile = await getCurrentProfile()
  if (!profile) {
    return { success: false, error: "Keine Berechtigung." }
  }

  const parsed = schema.safeParse({ hidden })
  if (!parsed.success) {
    return { success: false, error: "Ungültige Eingabe." }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("profiles")
    .update({ hidden_dashboard_widgets: parsed.data.hidden })
    .eq("id", profile.id)

  if (error) {
    return { success: false, error: "Einstellung konnte nicht gespeichert werden." }
  }

  revalidatePath("/", "layout")
  return { success: true }
}
