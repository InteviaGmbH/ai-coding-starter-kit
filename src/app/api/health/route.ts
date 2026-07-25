import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Confirms the app can reach the Supabase database. Public, unauthenticated.
export async function GET() {
  const supabase = await createClient()

  const { error } = await supabase.from('municipalities').select('id').limit(1)

  if (error) {
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 })
  }

  return NextResponse.json({ status: 'ok' })
}
