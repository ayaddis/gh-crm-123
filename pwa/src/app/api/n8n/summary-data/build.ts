import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { addDays, formatBusinessDate, todayMxIso } from '@/lib/format'

type Admin = SupabaseClient<Database>

export type Recipient = {
  kind: 'vendedor' | 'supervisor'
  user_id: string
  name: string
  email: string
  deliver_to: string
  subject: string
  data: Record<string, unknown>
}

const group = <T extends { owner_id: string | null }>(rows: T[]) => {
  const m = new Map<string, T[]>()
  for (const r of rows) if (r.owner_id) m.set(r.owner_id, [...(m.get(r.owner_id) ?? []), r])
  return m
}

/** Arma destinatarios y datos con llave secreta. El destinatario efectivo lo decide SIEMPRE la aplicación. */
export async function buildRecipients(admin: Admin, opts: { testMode: boolean; testRecipient: string; receiptAlertDays: number; renewalDays: number }): Promise<Recipient[]> {
  const today = todayMxIso()
  const [people, fuRes, rcRes, rnRes, kpis, ranking] = await Promise.all([
    admin.from('profiles').select('id, full_name, email, role').eq('is_active', true).order('full_name'),
    admin.from('v_follow_ups').select('owner_id, client_name, note, due_date, is_today, is_overdue').eq('status', 'pendiente').lte('due_date', today).order('due_date'),
    admin.from('v_receipts').select('owner_id, policy_number, client_name, installment_number, due_date, amount, days_to_due').eq('status', 'pendiente').lte('due_date', addDays(today, opts.receiptAlertDays)).order('due_date'),
    admin.from('v_policies').select('owner_id, policy_number, client_name, product_name, end_date, days_to_end').in('status', ['emitida', 'vigente']).gte('end_date', today).lte('end_date', addDays(today, opts.renewalDays)).order('end_date'),
    admin.from('v_team_kpis').select('*').maybeSingle(),
    admin.from('v_seller_ranking').select('*').order('won_premium_month', { ascending: false }),
  ])
  if (people.error || fuRes.error || rcRes.error || rnRes.error || kpis.error || ranking.error) throw new Error('No se pudo leer la información del resumen')

  const fu = group(fuRes.data ?? [])
  const rc = group(rcRes.data ?? [])
  const rn = group(rnRes.data ?? [])
  const dateLabel = formatBusinessDate(today)

  return (people.data ?? []).map((p): Recipient => {
    const base = {
      user_id: p.id,
      name: p.full_name,
      email: p.email,
      deliver_to: opts.testMode ? opts.testRecipient : p.email,
    }
    const prefix = opts.testMode ? `[Para: ${p.full_name}] ` : ''
    if (p.role === 'supervisor') {
      return { ...base, kind: 'supervisor', subject: `${prefix}Resumen del equipo · ${dateLabel}`, data: { team_kpis: kpis.data ?? null, ranking: ranking.data ?? [] } }
    }
    const f = fu.get(p.id) ?? []
    return {
      ...base,
      kind: 'vendedor',
      subject: `${prefix}Tu resumen de hoy · ${dateLabel}`,
      data: {
        follow_ups_today: f.filter((x) => x.is_today),
        follow_ups_overdue: f.filter((x) => x.is_overdue),
        receipts: rc.get(p.id) ?? [],
        renewals: rn.get(p.id) ?? [],
      },
    }
  })
}
