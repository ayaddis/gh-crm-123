import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/** Lee días de alerta de `settings` (todo usuario autenticado puede leerlos). */
export async function getAlertDays(supabase: SupabaseClient<Database>) {
  const { data } = await supabase.from('settings').select('key, value').in('key', ['receipt_alert_days', 'renewal_days'])
  const get = (k: string, d: number) => {
    const v = data?.find((r) => r.key === k)?.value
    return typeof v === 'number' ? v : d
  }
  return { receiptAlertDays: get('receipt_alert_days', 7), renewalDays: get('renewal_days', 60) }
}
