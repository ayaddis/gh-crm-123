import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { publicEnv } from '@/lib/env'
import { getServiceRoleKey } from '@/lib/env.server'
import type { Database } from '@/types/database'

/**
 * Cliente con llave secreta. Solo para la lista cerrada de TECHNICAL_SPEC.md §5
 * (administración de usuarios). Se crea DENTRO de la función que lo necesita.
 */
export function createAdminClient() {
  return createClient<Database>(publicEnv.NEXT_PUBLIC_SUPABASE_URL, getServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
