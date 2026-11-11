import 'server-only'
import { z } from 'zod'

/** Variables solo de servidor. Se validan al usarse (no al importar) para que el build no dependa de ellas. */
const schema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  N8N_WEBHOOK_URL: z.string().url(),
  N8N_WEBHOOK_SECRET: z.string().min(32),
  N8N_API_SECRET: z.string().min(32),
  MODO_PRUEBA: z.enum(['true', 'false']).default('true'),
  TEST_RECIPIENT_EMAIL: z.string().email(),
  RESEND_FROM_EMAIL: z.string().email(),
})

export type ServerEnv = z.infer<typeof schema>

export function serverEnv(): ServerEnv {
  const parsed = schema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    N8N_WEBHOOK_URL: process.env.N8N_WEBHOOK_URL,
    N8N_WEBHOOK_SECRET: process.env.N8N_WEBHOOK_SECRET,
    N8N_API_SECRET: process.env.N8N_API_SECRET,
    MODO_PRUEBA: process.env.MODO_PRUEBA,
    TEST_RECIPIENT_EMAIL: process.env.TEST_RECIPIENT_EMAIL,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
  })
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join('.')).join(', ')
    throw new Error(`Faltan o son inválidas estas variables de entorno de servidor: ${missing}`)
  }
  return parsed.data
}

/** Modo de pruebas: por defecto activo (más seguro). Solo se apaga con MODO_PRUEBA=false. */
export function isTestMode(): boolean {
  return process.env.MODO_PRUEBA !== 'false'
}
