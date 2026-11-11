import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatBusinessDate, formatMXN, REASSIGNED } from '@/lib/format'
import { formatPhone, normalizePhone } from '@/lib/phone'
import { Screen } from '@/components/layout/screen'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorNotice } from '@/components/page-state'

const TABS = [['seguimientos', 'Seguimientos vencidos'], ['recibos', 'Recibos vencidos'], ['pipeline', 'Pipeline']] as const

function Call({ phone }: { phone: string | null }) {
  if (!phone) return null
  return (
    <Button asChild variant="outline" className="shrink-0">
      <a href={`tel:+52${normalizePhone(phone)}`} aria-label={`Llamar al ${formatPhone(phone)}`}>Llamar</a>
    </Button>
  )
}

export default async function VendedorPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const sp = await searchParams
  const tab = TABS.find(([k]) => k === sp.tab)?.[0] ?? 'seguimientos'
  const supabase = await createClient()

  const { data: seller, error } = await supabase.from('v_seller_ranking').select('seller_name, goal_premium_month, won_premium_month').eq('seller_id', id).maybeSingle()
  if (error) return <Screen title="Vendedor"><ErrorNotice /></Screen>
  if (!seller) notFound()

  const [fu, rc, pp] = await Promise.all([
    tab === 'seguimientos' ? supabase.from('v_follow_ups').select('id, client_name, client_phone, note, due_date').eq('owner_id', id).eq('is_overdue', true).order('due_date') : null,
    tab === 'recibos' ? supabase.from('v_receipts').select('id, policy_number, client_name, client_phone, installment_number, due_date, amount').eq('owner_id', id).eq('effective_status', 'vencido').order('due_date') : null,
    tab === 'pipeline' ? supabase.from('opportunities').select('id, stage, estimated_annual_premium, clients(full_name, phone), products(name)').eq('owner_id', id).is('archived_at', null).in('stage', ['nuevo', 'contactado', 'cotizacion_enviada', 'negociacion']).order('estimated_annual_premium', { ascending: false }) : null,
  ])
  const failed = fu?.error || rc?.error || pp?.error
  const goal = seller.goal_premium_month === null ? null : Number(seller.goal_premium_month)
  const empty = (text: string) => <Card><EmptyState>{text}</EmptyState></Card>

  return (
    <Screen title={seller.seller_name ?? 'Vendedor'}>
      <Link href="/" className="inline-flex min-h-[44px] items-center text-base text-primary">← Panel</Link>
      <Card><CardContent className="p-3.5 text-base">
        {goal === null ? 'Sin meta asignada este mes' : <>Meta del mes: <strong>{formatMXN(goal)}</strong> · Ganado: <strong>{formatMXN(Number(seller.won_premium_month ?? 0))}</strong></>}
      </CardContent></Card>

      <nav aria-label="Secciones" className="grid grid-cols-3 gap-1 rounded-md bg-neutral-bg p-1">
        {TABS.map(([k, text]) => (
          <Link key={k} href={`/vendedor/${id}?tab=${k}`} aria-current={tab === k ? 'page' : undefined}
            className={`flex min-h-[48px] items-center justify-center rounded-sm px-1 text-center text-sm font-medium leading-tight ${tab === k ? 'bg-white shadow-[0_1px_2px_rgba(15,23,42,0.08)]' : 'text-ink-soft'}`}>{text}</Link>
        ))}
      </nav>

      {failed ? <ErrorNotice /> : (
        <>
          {tab === 'seguimientos' && ((fu?.data ?? []).length === 0 ? empty('No hay seguimientos vencidos.') : fu!.data!.map((f) => (
            <Card key={f.id}><CardContent className="flex items-center justify-between gap-3 p-3.5">
              <div className="min-w-0"><p className="text-base font-semibold">{f.client_name}</p><p className="text-sm text-ink-soft">{formatBusinessDate(f.due_date!)}{f.note ? ` · ${f.note}` : ''}</p><p className="text-sm">{f.client_phone ? formatPhone(f.client_phone) : ''}</p></div>
              <Call phone={f.client_phone} />
            </CardContent></Card>
          )))}
          {tab === 'recibos' && ((rc?.data ?? []).length === 0 ? empty('No hay recibos vencidos.') : rc!.data!.map((r) => (
            <Card key={r.id}><CardContent className="flex items-center justify-between gap-3 p-3.5">
              <div className="min-w-0"><p className="text-base font-semibold">{r.client_name ?? REASSIGNED}</p><p className="text-sm text-ink-soft">Póliza {r.policy_number} · recibo {r.installment_number} · {formatBusinessDate(r.due_date!)}</p><p className="text-sm tabular-nums">{formatMXN(Number(r.amount))}</p></div>
              <Call phone={r.client_phone} />
            </CardContent></Card>
          )))}
          {tab === 'pipeline' && ((pp?.data ?? []).length === 0 ? empty('No hay oportunidades abiertas.') : (pp!.data! as unknown as { id: string; estimated_annual_premium: number; clients: { full_name: string; phone: string } | null; products: { name: string } | null }[]).map((o) => (
            <Card key={o.id}><CardContent className="flex items-center justify-between gap-3 p-3.5">
              <div className="min-w-0"><p className="text-base font-semibold">{o.clients?.full_name ?? '—'}</p><p className="text-sm text-ink-soft">{o.products?.name}</p><p className="text-sm tabular-nums">{formatMXN(Number(o.estimated_annual_premium))}</p></div>
              <Call phone={o.clients?.phone ?? null} />
            </CardContent></Card>
          )))}
        </>
      )}
    </Screen>
  )
}
