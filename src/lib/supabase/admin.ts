import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Service-role Supabase client — bypasses Row Level Security.
// Server-only: never import this file from Client Components or expose the service role key to the browser.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
