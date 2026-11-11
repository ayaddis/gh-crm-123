import Link from 'next/link'
import { getCurrentProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { addDays, formatBusinessDate, formatMXN, formatTodayMx, greetingName, REASSIGNED, todayMxIso } from '@/lib/format'
import { getAlertDays } from '@/lib/settings'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { StatusBadge } from '@/components/status-badge'
import { EmptyState, ErrorNotice } from '@/components/page-state'
import { InlineAction } from '@/components/inline-action'
import { completeFollowUp } from './_actions/follow-ups'
import { markReceiptPaid } from './_actions/receipts'

const MAX_ROWS = 8

export default async function TableroPage({ searchParams }: { searchParams: Promise<{ vendedor?: string }> }) {
  const profile = await getCurrentProfile()
  if (!profile) return null
  const isSup = profile.role === 'supervisor'
  const { vendedor } = await searchParams
  const supabase = await createClient()
  const today = todayMxIso()
  const { receiptAlertDays, renewalDays } = await getAlertDays(supabase)

  const sellers = isSup
    ? ((await supabase.from('profiles').select('id, full_name').eq('is_active', true).order('full_name')).data ?? [])
    : []
  const selected = isSup && vendedor && sellers.some((s) => s.id === vendedor) ? vendedor : null
  // El vendedor ve solo lo suyo por RLS; el supervisor puede acotar a una persona.
  const byOwner = <T extends { eq: (c: string, v: string) => T }>(q: T) => (selected ? q.eq('owner_id', selected) : q)

  const [fuToday, fuOverdue, fuRows, rcRows, rcCount, rnRows, rnCount, rank] = await Promise.all([
    byOwner(supabase.from('v_follow_ups').select('id', { count: 'exact', head: true }).eq('is_today', true)),
    byOwner(supabase.from('v_follow_ups').select('id', { count: 'exact', head: true }).eq('is_overdue', true)),
    byOwner(supabase.from('v_follow_ups').select('id, client_id, client_name, note, due_date, is_overdue').eq('status', 'pendiente').lte('due_date', today)).order('due_date').limit(MAX_ROWS),
    byOwner(supabase.from('v_receipts').select('id, policy_id, policy_number, client_name, installment_number, due_date, amount, effective_status').eq('status', 'pendiente').lte('due_date', addDays(today, receiptAlertDays))).order('due_date').limit(MAX_ROWS),
    byOwner(supabase.from('v_receipts').select('id', { count: 'exact', head: true }).eq('status', 'pendiente').lte('due_date', addDays(today, receiptAlertDays))),
    byOwner(supabase.from('v_policies').select('id, policy_number, client_name, product_name, end_date, days_to_end').in('status', ['emitida', 'vigente']).gte('end_date', today).lte('end_date', addDays(today, renewalDays))).order('end_date').limit(MAX_ROWS),
    byOwner(supabase.from('v_policies').select('id', { count: 'exact', head: true }).in('status', ['emitida', 'vigente']).gte('end_date', today).lte('end_date', addDays(today, renewalDays))),
    selected ? supabase.from('v_seller_ranking').select('*').eq('seller_id', selected) : supabase.from('v_seller_ranking').select('*'),
  ])

  const failed = [fuToday, fuOverdue, fuRows, rcRows, rnRows, rank].some((r) => r.error)
  const counters = [
    { label: 'Seguimientos de hoy', value: fuToday.count ?? 0, href: '/clientes', alert: false },
    { label: 'Seguimientos vencidos', value: fuOverdue.count ?? 0, href: '/clientes', alert: (fuOverdue.count ?? 0) > 0 },
    { label: 'Recibos vencidos o por vencer', value: rcCount.count ?? 0, href: '/cobranza', alert: false },
    { label: 'Renovaciones próximas', value: rnCount.count ?? 0, href: '/polizas?vencen=60', alert: false },
  ]
  const nothing = counters.every((c) => c.value === 0)

  // Mi mes: el vendedor ve su fila; el supervisor, la persona elegida o la suma del equipo.
  const rows = rank.data ?? []
  const won = rows.reduce((a, r) => a + Number(r.won_premium_month ?? 0), 0)
  const goalRows = rows.filter((r) => r.goal_premium_month !== null)
  const goal = goalRows.length ? goalRows.reduce((a, r) => a + Number(r.goal_premium_month), 0) : null
  const openCount = rows.reduce((a, r) => a + Number(r.open_opportunities ?? 0), 0)
  const pipeline = rows.reduce((a, r) => a + Number(r.open_pipeline_premium ?? 0), 0)
  const pct = goal && goal > 0 ? Math.min(100, Math.round((won / goal) * 100)) : 0

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold">Hola, {greetingName(profile.full_name)}</h1>
          <p className="text-sm text-ink-soft">{formatTodayMx()}</p>
        </div>
        {isSup && (
          <form method="get" className="flex items-end gap-2">
            <div className="w-56 space-y-1">
              <label htmlFor="vendedor" className="text-xs font-medium text-ink-soft">Ver</label>
              <Select id="vendedor" name="vendedor" defaultValue={selected ?? ''}>
                <option value="">Todo el equipo</option>
                {sellers.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
              </Select>
            </div>
            <Button type="submit" variant="outline">Ver</Button>
          </form>
        )}
      </div>

      {failed && <ErrorNotice />}

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(150px,100%),1fr))]">
        {counters.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className={`rounded-md border bg-white px-4 py-3.5 transition-colors duration-150 hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${c.alert ? 'border-[#FCA5A5]' : 'border-line'}`}
          >
            <p className="text-xs text-ink-soft">{c.label}</p>
            <p className={`mt-1 text-[26px] font-semibold ${c.alert ? 'text-risk-fg' : ''}`}>{c.value}</p>
          </Link>
        ))}
      </div>

      {!failed && nothing && <p className="text-sm text-ink-soft">Sin pendientes por hoy.</p>}

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(440px,100%),1fr))]">
        <Card>
          <CardHeader><CardTitle>Seguimientos</CardTitle><Link href="/clientes" className="text-xs text-primary">Ver todos</Link></CardHeader>
          {(fuRows.data ?? []).length === 0 ? <EmptyState>No tienes seguimientos para hoy.</EmptyState> : (
            <ul>
              {fuRows.data!.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-3 border-b border-rowline px-4 py-2 last:border-0">
                  <div className="min-w-0 text-[13px]">
                    <Link href={`/clientes/${f.client_id}`} className="font-medium text-primary">{f.client_name}</Link>
                    <p className="truncate text-ink-soft">{f.note ?? 'Sin nota'}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-xs">{formatBusinessDate(f.due_date!)}</span>
                    {f.is_overdue && <span className="rounded-md bg-risk-bg px-2 py-0.5 text-xs font-medium text-risk-fg">Vencido</span>}
                    <InlineAction action={completeFollowUp} fields={{ id: f.id!, client_id: f.client_id! }} label="Marcar hecho" pendingLabel="Guardando…" />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader><CardTitle>Cobranza</CardTitle><Link href="/cobranza" className="text-xs text-primary">Ver todos</Link></CardHeader>
          {(rcRows.data ?? []).length === 0 ? <EmptyState>No hay recibos vencidos ni por vencer.</EmptyState> : (
            <ul>
              {rcRows.data!.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 border-b border-rowline px-4 py-2 last:border-0">
                  <div className="min-w-0 text-[13px]">
                    <Link href={`/polizas/${r.policy_id}`} className="font-medium text-primary">{r.policy_number}</Link>
                    <p className="truncate text-ink-soft">{r.client_name ?? REASSIGNED} · recibo {r.installment_number} · {formatBusinessDate(r.due_date!)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-[13px] tabular-nums">{formatMXN(Number(r.amount))}</span>
                    <StatusBadge status={r.effective_status === 'vencido' ? 'vencido' : 'pendiente'} labels={{ vencido: 'Vencido', pendiente: 'Por vencer' }} />
                    <InlineAction action={markReceiptPaid} fields={{ id: r.id!, policy_id: r.policy_id! }} label="Marcar pagado" pendingLabel="Guardando…" />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader><CardTitle>Renovaciones</CardTitle><Link href="/polizas?vencen=60" className="text-xs text-primary">Ver todos</Link></CardHeader>
          {(rnRows.data ?? []).length === 0 ? <EmptyState>Ninguna póliza vence en los próximos {renewalDays} días.</EmptyState> : (
            <ul>
              {rnRows.data!.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 border-b border-rowline px-4 py-2 last:border-0">
                  <div className="min-w-0 text-[13px]">
                    <Link href={`/polizas/${p.id}`} className="font-medium text-primary">{p.policy_number}</Link>
                    <p className="truncate text-ink-soft">{p.client_name ?? REASSIGNED} · {p.product_name}</p>
                  </div>
                  <div className="shrink-0 text-right text-xs">
                    <p>{formatBusinessDate(p.end_date!)}</p>
                    <p className="text-ink-soft">{p.days_to_end} días</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader><CardTitle>Mi mes</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-[13px]">
            {goal === null ? (
              <p className="text-ink-soft">Sin meta asignada este mes</p>
            ) : (
              <div className="space-y-1.5">
                <div className="flex justify-between"><span>Prima ganada del mes</span><span className="tabular-nums">{formatMXN(won)} de {formatMXN(goal)}</span></div>
                <div className="h-2 rounded-sm bg-line" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Avance de meta">
                  <div className="h-2 rounded-sm bg-primary" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-right text-xs text-ink-soft">{pct} %</p>
              </div>
            )}
            {goal === null && <div className="flex justify-between"><span>Prima ganada del mes</span><span className="tabular-nums">{formatMXN(won)}</span></div>}
            <div className="flex justify-between"><span>Oportunidades abiertas</span><span className="tabular-nums">{openCount}</span></div>
            <div className="flex justify-between"><span>Prima estimada en pipeline</span><span className="tabular-nums">{formatMXN(pipeline)}</span></div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
