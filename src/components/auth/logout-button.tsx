"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

export function LogoutButton({ variant = "outline" }: { variant?: "outline" | "ghost" }) {
  const [loading, setLoading] = useState(false)

  async function handleLogout() {
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = "/login"
  }

  return (
    <Button variant={variant} onClick={handleLogout} disabled={loading}>
      {loading ? "Wird abgemeldet…" : "Abmelden"}
    </Button>
  )
}
