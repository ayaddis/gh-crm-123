import Link from 'next/link'
import { getCurrentProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { formatBusinessDate, formatMXN, REASSIGNED } from '@/lib/format'
import { LABELS, label, options } from '@/lib/labels'
import { Table, Th, Td } from '@/components/ui/table'
import { Select } from '@/components/ui/select'
import { StatusBadge } from '@/components/status-badge'
import { EmptyState, ErrorNotice, PageHeader } from '@/components/page-state'
import { FilterBar, FilterItem } from '@/components/filter-bar'
import { Pagination, pageRange, parsePage } from '@/components/pagination'

type SP = { estatus?: string; producto?: string; aseguradora?: string; responsable?: string; vencen?: string; page?: string }

export default async function PolizasPage({ searchParams }: { searchParams: Promise<SP> }) {
  const profile = await getCurrentProfile()
  if (!profile) return null
  const isSup = profile.role === 'supervisor'
  const sp = await searchParams
  const page = parsePage(sp.page)
  const supabase = await createClient()

  let q = supabase.from('v_policies').select('id, policy_number, client_id, client_name, product_name, insurer_name, agent_name, annual_premium, payment_frequency, start_date, end_date, effective_status, owner_name', { count: 'exact' })
    .order('created_at', { ascending: false }).range(pageRange(page).from, pageRange(page).to)
  if (sp.estatus && sp.estatus in LABELS.policy) q = q.eq('effective_status', sp.estatus)
  if (sp.producto) q = q.eq('product_id', sp.producto)
  if (sp.aseguradora) q = q.eq('insurer_id', sp.aseguradora)
  if (isSup && sp.responsable) q = q.eq('owner_id', sp.responsable)
  if (sp.vencen === '60') q = q.in('status', ['emitida', 'vigente']).gte('days_to_end', 0).lte('days_to_end', 60)
  const { data, count, error } = await q

  const [products, insurers, owners] = await Promise.all([
    supabase.from('products').select('id, name').order('name'),
    supabase.from('insurers').select('id, name').order('name'),
    isSup ? supabase.from('profiles').select('id, full_name').eq('is_active', true).order('full_name') : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
  ])

  return (
    <>
      <PageHeader title="Pólizas">
        <FilterBar action="/polizas">
          <FilterItem label="Estatus"><Select name="estatus" defaultValue={sp.estatus ?? ''}><option value="">Todos</option>{options(LABELS.policy).map((o) => <option key={o.value} value={o.value}>{o.text}</option>)}</Select></FilterItem>
          <FilterItem label="Producto"><Select name="producto" defaultValue={sp.producto ?? ''}><option value="">Todos</option>{(products.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></FilterItem>
          <FilterItem label="Aseguradora"><Select name="aseguradora" defaultValue={sp.aseguradora ?? ''}><option value="">Todas</option>{(insurers.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></FilterItem>
          {isSup && <FilterItem label="Responsable"><Select name="responsable" defaultValue={sp.responsable ?? ''}><option value="">Todos</option>{(owners.data ?? []).map((o) => <option key={o.id} value={o.id}>{o.full_name}</option>)}</Select></FilterItem>}
          <label className="flex h-9 items-center gap-2 text-[13px]"><input type="checkbox" name="vencen" value="60" defaultChecked={sp.vencen === '60'} /> Vencen en los próximos 60 días</label>
        </FilterBar>
      </PageHeader>
      {error ? <ErrorNotice /> : (data ?? []).length === 0 ? <div className="rounded-md border border-line bg-white"><EmptyState>Aún no hay pólizas.</EmptyState></div> : (
        <>
          <Table><thead><tr><Th>N.º de póliza</Th><Th>Cliente</Th><Th>Producto</Th><Th>Aseguradora</Th><Th>Agente</Th><Th className="text-right">Prima anual</Th><Th>Forma de pago</Th><Th>Vigencia</Th><Th>Estatus</Th>{isSup && <Th>Responsable</Th>}</tr></thead><tbody>
            {data!.map((p) => (
              <tr key={p.id}>
                <Td><Link href={`/polizas/${p.id}`} className="font-medium text-primary">{p.policy_number}</Link></Td>
                <Td>{p.client_id && p.client_name ? <Link href={`/clientes/${p.client_id}`} className="text-primary">{p.client_name}</Link> : REASSIGNED}</Td>
                <Td>{p.product_name}</Td><Td>{p.insurer_name}</Td><Td>{p.agent_name ?? '—'}</Td>
                <Td className="text-right tabular-nums">{formatMXN(Number(p.annual_premium))}</Td>
                <Td>{label(LABELS.frequency, p.payment_frequency)}</Td>
                <Td className="whitespace-nowrap">{formatBusinessDate(p.start_date!)} – {formatBusinessDate(p.end_date!)}</Td>
                <Td><StatusBadge status={p.effective_status} labels={LABELS.policy} /></Td>
                {isSup && <Td>{p.owner_name ?? '—'}</Td>}
              </tr>
            ))}</tbody></Table>
          <Pagination page={page} total={count ?? 0} path="/polizas" params={{ estatus: sp.estatus, producto: sp.producto, aseguradora: sp.aseguradora, responsable: sp.responsable, vencen: sp.vencen }} />
        </>
      )}
    </>
  )
}
