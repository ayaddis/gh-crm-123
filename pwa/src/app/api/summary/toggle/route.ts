import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireSupervisor } from '@/lib/session'
import { json, isSameOrigin, readJsonBody } from '@/lib/http'
import { EVENT } from '@/lib/summary'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Interruptor del envío automático. Usa la sesión (RLS), no la llave secreta. */
export async function POST(request: NextRequest) {
  const me = await requireSupervisor()
  if (!me) return json({ error: 'forbidden' }, 403)
  if (!isSameOrigin(request) || !request.headers.get('content-type')?.includes('application/json')) return json({ error: 'forbidden' }, 403)
  const body = z.object({ enabled: z.boolean() }).safeParse(await readJsonBody(request))
  if (!body.success) return json({ error: 'Solicitud inválida.' }, 400)

  const supabase = await createClient()
  const { error } = await supabase.from('settings').update({ value: body.data.enabled }).eq('key', 'morning_summary_enabled')
  if (error) {
    console.error('summary/toggle: settings', error.code)
    return json({ error: error.code === '42501' ? 'No tienes permiso para esta acción.' : 'Ocurrió un error. Intenta de nuevo.' }, error.code === '42501' ? 403 : 500)
  }
  await supabase.rpc('log_event', { p_event: EVENT.toggle, p_details: { enabled: body.data.enabled } })
  return json({ enabled: body.data.enabled })
}
