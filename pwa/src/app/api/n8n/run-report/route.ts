import type { NextRequest } from 'next/server'
import { z } from 'zod'
import type { Json } from '@/types/database'
import { createAdminClient } from '@/lib/supabase/admin'
import { json, n8nUnauthorized, readJsonBody } from '@/lib/http'
import { EVENT } from '@/lib/summary'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const schema = z.object({
  run_id: z.string().uuid(),
  mode: z.enum(['scheduled', 'manual']),
  sent: z.array(z.object({ user_id: z.string().uuid(), resend_id: z.string().max(100).nullish() })).max(50),
  failed: z.array(z.object({ user_id: z.string().uuid(), error: z.string().transform((s) => s.slice(0, 200)) })).max(50),
})

/** n8n informa el resultado de los envíos. Solo se acepta para un run_id ya iniciado. */
export async function POST(request: NextRequest) {
  const denied = n8nUnauthorized(request)
  if (denied) return denied
  const parsed = schema.safeParse(await readJsonBody(request))
  if (!parsed.success) return json({ error: 'bad_request' }, 400)
  const { run_id, mode, sent, failed } = parsed.data

  const admin = createAdminClient()
  const { data } = await admin.from('audit_log').select('event, details').in('event', [EVENT.started, EVENT.finished]).order('created_at', { ascending: false }).limit(200)
  const same = (data ?? []).filter((e) => (e.details as { run_id?: string } | null)?.run_id === run_id)
  if (!same.some((e) => e.event === EVENT.started)) return json({ error: 'unknown_run' }, 404)
  if (same.some((e) => e.event === EVENT.finished)) return json({ ok: true, duplicate: true })

  const { error } = await admin.from('audit_log').insert({
    table_name: 'app', action: 'event', event: EVENT.finished,
    details: { run_id, mode, sent: sent.length, failed } as unknown as Json,
  })
  if (error) return json({ error: 'server_error' }, 500)
  return json({ ok: true })
}
