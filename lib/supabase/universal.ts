import { createBrowserClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

export async function getUniversalSupabase() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}