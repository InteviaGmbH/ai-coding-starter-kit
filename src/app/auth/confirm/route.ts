import { NextResponse } from "next/server"
import type { EmailOtpType } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"

// Every Supabase email link (password recovery, admin invite, and any
// future signup confirmation) needs to land here first, not directly on
// the destination page. @supabase/ssr's createBrowserClient/createServerClient
// default to the PKCE flow, so the link Supabase sends carries a `code`
// param that has to be exchanged for a session server-side (only Route
// Handlers/Server Actions are allowed to write the resulting session
// cookie — a Server Component can't, see the comment in
// src/lib/supabase/server.ts). Some email templates instead carry
// `token_hash`+`type` (Supabase's own hosted verify step already
// consumed the raw token before redirecting here) — handled the same way,
// via verifyOtp instead of exchangeCodeForSession.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const tokenHash = searchParams.get("token_hash")
  const type = searchParams.get("type") as EmailOtpType | null
  const next = searchParams.get("next") ?? "/reset-password"

  const supabase = await createClient()

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
      : { error: new Error("missing code/token_hash") }

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=invalid_link`)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
