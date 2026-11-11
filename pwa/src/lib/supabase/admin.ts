import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { publicEnv } from '@/lib/env'
import { serverEnv } from '@/lib/env.server'
import type { Database } from '@/types/database'

/**
 * Cliente con llave secreta. Solo para la lista cerrada de TECHNICAL_SPEC.md §5
 * (Route Handlers /api/n8n/* y /api/summary/trigger). Se crea DENTRO de la función que lo necesita.
 */
export function createAdminClient() {
  return createClient<Database>(publicEnv.NEXT_PUBLIC_SUPABASE_URL, serverEnv().SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
