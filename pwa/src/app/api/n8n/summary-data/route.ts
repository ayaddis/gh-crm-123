import { randomUUID } from 'node:crypto'
import type { NextRequest } from 'next/server'
import type { Json } from '@/types/database'
import { createAdminClient } from '@/lib/supabase/admin'
import { serverEnv, isTestMode } from '@/lib/env.server'
import { json, n8nUnauthorized } from '@/lib/http'
import { todayMxIso } from '@/lib/format'
import { checkRunId, EVENT, isoWeekday, type AuditEvent } from '@/lib/summary'
import { buildRecipients } from './build'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Datos del resumen para n8n (TECHNICAL_SPEC.md §10.3). n8n nunca toca Postgres. */
export async function GET(request: NextRequest) {
  const denied = n8nUnauthorized(request)
  if (denied) return denied

  const mode = request.nextUrl.searchParams.get('mode')
  if (mode !== 'scheduled' && mode !== 'manual') return json({ error: 'bad_request' }, 400)
  const runIdParam = request.nextUrl.searchParams.get('run_id')

  const admin = createAdminClient()
  const now = new Date()
  const dateMx = todayMxIso(now)

  const { data: cfg } = await admin.from('settings').select('key, value')
  const get = (k: string) => cfg?.find((r) => r.key === k)?.value
  const timezone = typeof get('timezone') === 'string' ? (get('timezone') as string) : 'America/Mexico_City'

  const { data: rows, error: logErr } = await admin
    .from('audit_log').select('event, created_at, details')
    .in('event', [EVENT.requested, EVENT.started, EVENT.finished]).order('created_at', { ascending: false }).limit(200)
  if (logErr) return json({ error: 'server_error' }, 500)
  const events = (rows ?? []) as AuditEvent[]

  let runId: string
  if (mode === 'scheduled') {
    if (get('morning_summary_enabled') !== true) return json({ skipped: true, reason: 'disabled' })
    const weekdays = Array.isArray(get('summary_weekdays')) ? (get('summary_weekdays') as number[]) : [1, 2, 3, 4, 5]
    if (!weekdays.includes(isoWeekday(now, timezone))) return json({ skipped: true, reason: 'not_a_business_day' })
    if (events.some((e) => e.event === EVENT.started && e.details?.mode === 'scheduled' && e.details?.date_mx === dateMx)) {
      return json({ skipped: true, reason: 'already_ran' })
    }
    runId = randomUUID() // en modo programado el run_id lo genera el servidor
  } else {
    const check = checkRunId(runIdParam, events, now)
    if (!check.ok) return json({ skipped: true, reason: check.reason })
    runId = runIdParam as string
  }

  // Se registra el inicio (esto consume el run_id: un solo uso).
  const { error: startErr } = await admin.from('audit_log').insert({
    table_name: 'app', action: 'event', event: EVENT.started,
    details: { run_id: runId, mode, date_mx: dateMx } as Json,
  })
  if (startErr) return json({ error: 'server_error' }, 500)

  const maintenance = await admin.rpc('run_daily_maintenance')
  if (maintenance.error) console.error('summary-data: run_daily_maintenance', maintenance.error.code)

  try {
    const env = serverEnv()
    const test = isTestMode()
    const recipients = await buildRecipients(admin, {
      testMode: test,
      testRecipient: env.TEST_RECIPIENT_EMAIL,
      receiptAlertDays: Number(get('receipt_alert_days') ?? 7),
      renewalDays: Number(get('renewal_days') ?? 60),
    })
    return json({ skipped: false, run_id: runId, mode, date_mx: dateMx, test_mode: test, from_email: env.RESEND_FROM_EMAIL, recipients })
  } catch (e) {
    console.error('summary-data: armado falló', e instanceof Error ? e.message : 'error')
    return json({ error: 'server_error' }, 500)
  }
}
