import { getCurrentProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { formatMXN, todayMxIso } from '@/lib/format'
import { LABELS, options } from '@/lib/labels'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { EmptyState, ErrorNotice, PageHeader } from '@/components/page-state'
import { FilterBar, FilterItem } from '@/components/filter-bar'
import { Pagination, pageRange, parsePage } from '@/components/pagination'
import { CommissionsTable, type CommissionRow } from '@/components/commissions-table'

type SP = { beneficiario?: string; persona?: string; tipo?: string; estatus?: string; mes?: string; page?: string }

export default async function ComisionesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const profile = await getCurrentProfile()
  if (!profile) return null
  const isSup = profile.role === 'supervisor'
  const sp = await searchParams
  const page = parsePage(sp.page)
  const supabase = await createClient()
  const monthStart = `${todayMxIso().slice(0, 7)}-01`

  const q = supabase.from('v_commissions').select('id, policy_number, client_name, beneficiary_type, commission_type, installment_number, base_amount, rate_pct, amount, status, executive_id, executive_name, agent_id, agent_name', { count: 'exact' })
    .order('created_at', { ascending: false }).range(pageRange(page).from, pageRange(page).to)
  const t = supabase.from('v_commissions').select('amount, status, settled_at')
  const apply = <T extends { eq: (c: string, v: string) => T; gte: (c: string, v: string) => T; lt: (c: string, v: string) => T; or: (f: string) => T }>(x: T): T => {
    let r = x
    if (isSup) {
      if (sp.beneficiario && sp.beneficiario in LABELS.beneficiary) r = r.eq('beneficiary_type', sp.beneficiario)
      if (sp.persona && /^[0-9a-f-]{36}$/i.test(sp.persona)) r = r.or(`executive_id.eq.${sp.persona},agent_id.eq.${sp.persona}`)
    }
    if (sp.tipo && sp.tipo in LABELS.commissionType) r = r.eq('commission_type', sp.tipo)
    if (sp.estatus && sp.estatus in LABELS.commission) r = r.eq('status', sp.estatus)
    if (isSup && sp.mes && /^\d{4}-\d{2}$/.test(sp.mes)) {
      const [y, m] = sp.mes.split('-').map(Number)
      const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`
      r = r.gte('created_at', `${sp.mes}-01T00:00:00-06:00`).lt('created_at', `${next}T00:00:00-06:00`)
    }
    return r
  }
  const { data, count, error } = await apply(q)
  const { data: sums } = await apply(t).limit(5000)

  const [agents, owners] = isSup
    ? await Promise.all([supabase.from('agents').select('id, full_name').order('full_name'), supabase.from('profiles').select('id, full_name').eq('is_active', true).order('full_name')])
    : [{ data: [] as { id: string; full_name: string }[] }, { data: [] as { id: string; full_name: string }[] }]

  const pending = (sums ?? []).filter((r) => r.status === 'pendiente').reduce((a, r) => a + Number(r.amount), 0)
  const settled = (sums ?? []).filter((r) => r.status === 'liquidada').reduce((a, r) => a + Number(r.amount), 0)
  const settledMonth = (sums ?? []).filter((r) => r.status === 'liquidada' && r.settled_at && r.settled_at >= `${monthStart}T00:00:00-06:00`).reduce((a, r) => a + Number(r.amount), 0)

  const rows: CommissionRow[] = (data ?? []).map((r) => ({
    id: r.id!, policy_number: r.policy_number!, client_name: r.client_name, beneficiary_type: r.beneficiary_type!,
    person: (r.beneficiary_type === 'agente' ? r.agent_name : r.executive_name) ?? '—',
    commission_type: r.commission_type!, installment_number: r.installment_number!, base_amount: Number(r.base_amount),
    rate_pct: Number(r.rate_pct), amount: Number(r.amount), status: r.status!,
  }))

  return (
    <>
      <PageHeader title="Comisiones">
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr))]">
          <Card><CardContent><p className="text-xs text-ink-soft">Pendiente por liquidar</p><p className="mt-1 text-[26px] font-semibold tabular-nums">{formatMXN(pending)}</p></CardContent></Card>
          <Card><CardContent><p className="text-xs text-ink-soft">{isSup ? 'Liquidado (vista actual)' : 'Liquidado del mes'}</p><p className="mt-1 text-[26px] font-semibold tabular-nums">{formatMXN(isSup ? settled : settledMonth)}</p></CardContent></Card>
        </div>
        <FilterBar action="/comisiones">
          {isSup && <FilterItem label="Beneficiario"><Select name="beneficiario" defaultValue={sp.beneficiario ?? ''}><option value="">Todos</option>{options(LABELS.beneficiary).map((o) => <option key={o.value} value={o.value}>{o.text}</option>)}</Select></FilterItem>}
          {isSup && <FilterItem label="Persona"><Select name="persona" defaultValue={sp.persona ?? ''}><option value="">Todas</option>{(owners.data ?? []).map((o) => <option key={o.id} value={o.id}>{o.full_name}</option>)}{(agents.data ?? []).map((a) => <option key={a.id} value={a.id}>{a.full_name} (agente)</option>)}</Select></FilterItem>}
          <FilterItem label="Tipo"><Select name="tipo" defaultValue={sp.tipo ?? ''}><option value="">Todos</option>{options(LABELS.commissionType).map((o) => <option key={o.value} value={o.value}>{o.text}</option>)}</Select></FilterItem>
          <FilterItem label="Estatus"><Select name="estatus" defaultValue={sp.estatus ?? ''}><option value="">Todos</option>{options(LABELS.commission).map((o) => <option key={o.value} value={o.value}>{o.text}</option>)}</Select></FilterItem>
          {isSup && <FilterItem label="Mes (fecha de generación)"><Input type="month" name="mes" defaultValue={sp.mes ?? ''} /></FilterItem>}
        </FilterBar>
      </PageHeader>
      {error ? <ErrorNotice /> : rows.length === 0 ? <div className="rounded-md border border-line bg-white"><EmptyState>Aún no hay comisiones. Se generan al marcar recibos como pagados.</EmptyState></div> : (
        <>
          <CommissionsTable rows={rows} isSupervisor={isSup} />
          <Pagination page={page} total={count ?? 0} path="/comisiones" params={{ beneficiario: sp.beneficiario, persona: sp.persona, tipo: sp.tipo, estatus: sp.estatus, mes: sp.mes }} />
        </>
      )}
    </>
  )
}
