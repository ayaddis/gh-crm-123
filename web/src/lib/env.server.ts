import 'server-only'
import { z } from 'zod'

const schema = z.object({ SUPABASE_SERVICE_ROLE_KEY: z.string().min(20) })

/** Llave secreta de Supabase. Solo servidor; se lee aquí y se valida al usarse. */
export function getServiceRoleKey(): string {
  const parsed = schema.safeParse({ SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY })
  if (!parsed.success) {
    throw new Error('Falta la variable de entorno SUPABASE_SERVICE_ROLE_KEY (solo servidor).')
  }
  return parsed.data.SUPABASE_SERVICE_ROLE_KEY
}
