import { randomUUID } from 'node:crypto'
import type { NextRequest } from 'next/server'
import type { Json } from '@/types/database'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { serverEnv } from '@/lib/env.server'
import { requireSupervisor } from '@/lib/session'
import { json, isSameOrigin } from '@/lib/http'
import { cooldownRemainingSeconds, EVENT, hasRunInProgress, type AuditEvent } from '@/lib/summary'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Disparo manual del resumen (TECHNICAL_SPEC.md §10.2). El cliente NO envía destinatarios ni contenido. */
export async function POST(request: NextRequest) {
  // 1. Solo Supervisor con sesión válida (rol desde profiles).
  const me = await requireSupervisor()
  if (!me) return json({ error: 'forbidden' }, 403)
  // 2. Solo desde la propia PWA, con JSON.
  if (!isSameOrigin(request) || !request.headers.get('content-type')?.includes('application/json')) {
    return json({ error: 'forbidden' }, 403)
  }

  const supabase = await createClient()
  const now = new Date()
  const [{ data: rows }, { data: setting }] = await Promise.all([
    supabase.from('audit_log').select('event, created_at, details').in('event', [EVENT.requested, EVENT.started, EVENT.finished]).order('created_at', { ascending: false }).limit(100),
    supabase.from('settings').select('value').eq('key', 'trigger_cooldown_seconds').maybeSingle(),
  ])
  const events = (rows ?? []) as AuditEvent[]
  const cooldown = typeof setting?.value === 'number' ? setting.value : 120

  // 3. Enfriamiento.
  const wait = cooldownRemainingSeconds(events, cooldown, now)
  if (wait > 0) return json({ error: 'Espera unos segundos antes de enviar otro resumen.', retry_after_s: wait }, 429)
  // 4. Sin ejecución simultánea.
  if (hasRunInProgress(events, now)) return json({ error: 'Ya hay un envío en proceso.' }, 409)

  // 5. Se registra la solicitud ANTES de llamar a n8n (run_id de un solo uso, vence a los 10 min).
  const runId = randomUUID()
  const admin = createAdminClient()
  const { error: logError } = await admin.from('audit_log').insert({
    table_name: 'app', action: 'event', event: EVENT.requested, actor_id: me.id,
    details: { run_id: runId, mode: 'manual', actor_id: me.id } as Json,
  })
  if (logError) {
    console.error('summary/trigger: no se pudo registrar la solicitud', logError.code)
    return json({ error: 'El envío no se pudo iniciar. Intenta de nuevo.' }, 500)
  }

  // 6. Llamada al webhook de n8n desde el servidor: URL y secreto nunca llegan al navegador.
  try {
    const env = serverEnv()
    const res = await fetch(env.N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-crm-webhook-secret': env.N8N_WEBHOOK_SECRET },
      body: JSON.stringify({ run_id: runId }),
      redirect: 'manual',
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) {
      console.error('summary/trigger: n8n respondió', res.status)
      return json({ error: 'El envío no se pudo iniciar. Intenta de nuevo.' }, 502)
    }
  } catch (e) {
    console.error('summary/trigger: fallo al llamar a n8n', e instanceof Error ? e.name : 'error')
    return json({ error: 'El envío no se pudo iniciar. Intenta de nuevo.' }, 502)
  }
  // 11. El navegador consulta /api/summary/status hasta ver el resultado.
  return json({ run_id: runId }, 202)
}
