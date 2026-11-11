import type { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { serverEnv, isTestMode } from '@/lib/env.server'
import { json, n8nUnauthorized } from '@/lib/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const denied = n8nUnauthorized(request)
  if (denied) return denied
  const admin = createAdminClient()
  const { data } = await admin.from('settings').select('key, value').in('key', ['morning_summary_enabled', 'morning_summary_time', 'timezone'])
  const get = (k: string) => data?.find((r) => r.key === k)?.value
  const env = serverEnv()
  const test = isTestMode()
  return json({
    enabled: get('morning_summary_enabled') === true,
    timezone: typeof get('timezone') === 'string' ? get('timezone') : 'America/Mexico_City',
    send_time: typeof get('morning_summary_time') === 'string' ? get('morning_summary_time') : '07:30',
    from_email: env.RESEND_FROM_EMAIL,
    test_mode: test,
    ...(test ? { test_recipient: env.TEST_RECIPIENT_EMAIL } : {}),
  })
}
