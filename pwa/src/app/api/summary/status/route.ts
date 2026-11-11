import { createClient } from '@/lib/supabase/server'
import { requireSupervisor } from '@/lib/session'
import { json } from '@/lib/http'
import { isTestMode } from '@/lib/env.server'
import { cooldownRemainingSeconds, EVENT, lastRunOf, type AuditEvent } from '@/lib/summary'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Estado del resumen para la pantalla P6. Lee con la sesión del supervisor. */
export async function GET() {
  const me = await requireSupervisor()
  if (!me) return json({ error: 'forbidden' }, 403)
  const supabase = await createClient()
  const now = new Date()
  const [{ data: rows, error }, { data: settings }, { data: people }] = await Promise.all([
    supabase.from('audit_log').select('event, created_at, details').in('event', [EVENT.requested, EVENT.started, EVENT.finished]).order('created_at', { ascending: false }).limit(100),
    supabase.from('settings').select('key, value').in('key', ['morning_summary_enabled', 'trigger_cooldown_seconds']),
    supabase.from('profiles').select('id, full_name'),
  ])
  if (error) return json({ error: 'No pudimos cargar la información. Intenta de nuevo.' }, 500)

  const events = (rows ?? []) as AuditEvent[]
  const enabled = settings?.find((s) => s.key === 'morning_summary_enabled')?.value === true
  const cooldown = Number(settings?.find((s) => s.key === 'trigger_cooldown_seconds')?.value ?? 120)
  const names = new Map((people ?? []).map((p) => [p.id, p.full_name]))
  const last = lastRunOf(events, now)
  return json({
    enabled,
    test_mode: isTestMode(),
    cooldown_remaining_s: cooldownRemainingSeconds(events, cooldown, now),
    last_run: last && { ...last, failed: last.failed.map((f) => ({ name: (f.user_id && names.get(f.user_id)) || 'Usuario', error: f.error ?? 'Sin detalle' })) },
  })
}
