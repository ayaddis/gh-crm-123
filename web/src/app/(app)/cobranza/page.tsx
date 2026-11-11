import Link from 'next/link'
import { getCurrentProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { formatBusinessDate, formatMXN, REASSIGNED } from '@/lib/format'
import { formatPhone } from '@/lib/phone'
import { getAlertDays } from '@/lib/settings'
import { LABELS } from '@/lib/labels'
import { Table, Th, Td } from '@/components/ui/table'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/status-badge'
import { EmptyState, ErrorNotice, PageHeader } from '@/components/page-state'
import { FilterBar, FilterItem } from '@/components/filter-bar'
import { Pagination, pageRange, parsePage } from '@/components/pagination'
import { InlineAction } from '@/components/inline-action'
import { markReceiptPaid } from '../_actions/receipts'

type SP = { tab?: string; responsable?: string; desde?: string; hasta?: string; page?: string }
const TABS = [['vencidos', 'Vencidos'], ['por-vencer', 'Por vencer'], ['todos', 'Todos']] as const

export default async function CobranzaPage({ searchParams }: { searchParams: Promise<SP> }) {
  const profile = await getCurrentProfile()
  if (!profile) return null
  const isSup = profile.role === 'supervisor'
  const sp = await searchParams
  const tab = TABS.find(([k]) => k === sp.tab)?.[0] ?? 'vencidos'
  const page = parsePage(sp.page)
  const supabase = await createClient()
  const { receiptAlertDays } = await getAlertDays(supabase)

  const filters = <T extends { eq: (c: string, v: string) => T; gte: (c: string, v: string) => T; lte: (c: string, v: string) => T }>(q: T): T => {
    let r = q
    if (tab === 'vencidos') r = (r as never as { eq: (c: string, v: string) => T }).eq('effective_status', 'vencido')
    if (isSup && sp.responsable) r = r.eq('owner_id', sp.responsable)
    if (sp.desde && /^\d{4}-\d{2}-\d{2}$/.test(sp.desde)) r = r.gte('due_date', sp.desde)
    if (sp.hasta && /^\d{4}-\d{2}-\d{2}$/.test(sp.hasta)) r = r.lte('due_date', sp.hasta)
    return r
  }
  let base = supabase.from('v_receipts').select('id, policy_id, policy_number, client_id, client_name, client_phone, installment_number, due_date, amount, effective_status', { count: 'exact' })
  let totals = supabase.from('v_receipts').select('amount')
  if (tab === 'por-vencer') {
    base = base.eq('status', 'pendiente').gte('days_to_due', 0).lte('days_to_due', receiptAlertDays)
    totals = totals.eq('status', 'pendiente').gte('days_to_due', 0).lte('days_to_due', receiptAlertDays)
  }
  const { data, count, error } = await filters(base).order('due_date').range(pageRange(page).from, pageRange(page).to)
  const { data: amounts } = await filters(totals).limit(5000)
  const total = (amounts ?? []).reduce((a, r) => a + Number(r.amount ?? 0), 0)
  const owners = isSup ? ((await supabase.from('profiles').select('id, full_name').eq('is_active', true).order('full_name')).data ?? []) : []
  const qs = (k: string) => `/cobranza?${new URLSearchParams({ tab: k, ...(sp.responsable ? { responsable: sp.responsable } : {}), ...(sp.desde ? { desde: sp.desde } : {}), ...(sp.hasta ? { hasta: sp.hasta } : {}) })}`

  return (
    <>
      <PageHeader title="Cobranza">
        <nav aria-label="Vistas" className="flex gap-1 border-b border-line">
          {TABS.map(([k, text]) => (
            <Link key={k} href={qs(k)} aria-current={tab === k ? 'page' : undefined} className={`-mb-px border-b-2 px-3 py-2 text-[13px] font-medium ${tab === k ? 'border-primary text-primary' : 'border-transparent text-ink-soft'}`}>
              {k === 'por-vencer' ? `Por vencer (${receiptAlertDays} días)` : text}
            </Link>
          ))}
        </nav>
        <FilterBar action="/cobranza">
          <input type="hidden" name="tab" value={tab} />
          {isSup && <FilterItem label="Responsable"><Select name="responsable" defaultValue={sp.responsable ?? ''}><option value="">Todos</option>{owners.map((o) => <option key={o.id} value={o.id}>{o.full_name}</option>)}</Select></FilterItem>}
          <FilterItem label="Vence desde"><Input type="date" name="desde" defaultValue={sp.desde ?? ''} /></FilterItem>
          <FilterItem label="Vence hasta"><Input type="date" name="hasta" defaultValue={sp.hasta ?? ''} /></FilterItem>
        </FilterBar>
      </PageHeader>
      {error ? <ErrorNotice /> : (data ?? []).length === 0 ? <div className="rounded-md border border-line bg-white"><EmptyState>No hay recibos vencidos ni por vencer.</EmptyState></div> : (
        <>
          <Table><thead><tr><Th>Póliza</Th><Th>Cliente</Th><Th>Teléfono</Th><Th>Recibo</Th><Th>Vencimiento</Th><Th className="text-right">Monto</Th><Th>Estatus</Th><Th /></tr></thead><tbody>
            {data!.map((r) => (
              <tr key={r.id}>
                <Td><Link href={`/polizas/${r.policy_id}`} className="font-medium text-primary">{r.policy_number}</Link></Td>
                <Td>{r.client_id && r.client_name ? <Link href={`/clientes/${r.client_id}`} className="text-primary">{r.client_name}</Link> : REASSIGNED}</Td>
                <Td>{r.client_phone ? formatPhone(r.client_phone) : '—'}</Td><Td>{r.installment_number}</Td><Td>{formatBusinessDate(r.due_date!)}</Td>
                <Td className="text-right tabular-nums">{formatMXN(Number(r.amount))}</Td>
                <Td><StatusBadge status={r.effective_status} labels={LABELS.receipt} /></Td>
                <Td className="text-right">{(r.effective_status === 'pendiente' || r.effective_status === 'vencido') && <InlineAction action={markReceiptPaid} fields={{ id: r.id!, policy_id: r.policy_id! }} label="Marcar pagado" pendingLabel="Guardando…" />}</Td>
              </tr>
            ))}</tbody>
            <tfoot><tr><Td className="font-semibold" colSpan={5}>Total de la vista</Td><Td className="text-right font-semibold tabular-nums">{formatMXN(total)}</Td><Td colSpan={2} /></tr></tfoot></Table>
          <Pagination page={page} total={count ?? 0} path="/cobranza" params={{ tab, responsable: sp.responsable, desde: sp.desde, hasta: sp.hasta }} />
        </>
      )}
    </>
  )
}
