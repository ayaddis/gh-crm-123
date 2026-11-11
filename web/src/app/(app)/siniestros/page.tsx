import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatBusinessDate, todayMxIso } from '@/lib/format'
import { LABELS, options } from '@/lib/labels'
import { Table, Th, Td } from '@/components/ui/table'
import { Select } from '@/components/ui/select'
import { StatusBadge } from '@/components/status-badge'
import { EmptyState, ErrorNotice, PageHeader } from '@/components/page-state'
import { FilterBar, FilterItem } from '@/components/filter-bar'
import { Pagination, pageRange, parsePage } from '@/components/pagination'
import { FormModal } from '@/components/form-modal'
import { ClaimFields, ClaimStatusFields } from '@/components/forms/claim-fields'
import { createClaim, updateClaimStatus } from '../_actions/claims'

type SP = { estatus?: string; page?: string }

export default async function SiniestrosPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams
  const page = parsePage(sp.page)
  const estatus = sp.estatus ?? 'abiertos'
  const supabase = await createClient()

  let q = supabase.from('claims').select('id, policy_id, event_date, insurer_claim_number, status, policies(policy_number), clients(full_name)', { count: 'exact' })
    .order('event_date', { ascending: false }).range(pageRange(page).from, pageRange(page).to)
  if (estatus === 'abiertos') q = q.in('status', ['reportado', 'en_tramite'])
  else if (estatus in LABELS.claim) q = q.eq('status', estatus)
  const { data, count, error } = await q
  const { data: pols } = await supabase.from('v_policies').select('id, policy_number, client_name').in('status', ['emitida', 'vigente']).order('policy_number').limit(300)
  const rows = (data ?? []) as unknown as { id: string; policy_id: string; event_date: string; insurer_claim_number: string | null; status: string; policies: { policy_number: string } | null; clients: { full_name: string } | null }[]

  return (
    <>
      <PageHeader title="Siniestros" action={
        <FormModal title="Registrar siniestro" triggerLabel="Registrar siniestro" kind="drawer" action={createClaim} submitLabel="Guardar" pendingLabel="Guardando…">
          <ClaimFields today={todayMxIso()} policies={(pols ?? []).map((p) => ({ value: p.id!, text: `${p.policy_number} · ${p.client_name ?? 'Cliente reasignado'}` }))} />
        </FormModal>
      }>
        <FilterBar action="/siniestros">
          <FilterItem label="Estatus"><Select name="estatus" defaultValue={estatus}><option value="abiertos">Abiertos</option><option value="todos">Todos</option>{options(LABELS.claim).map((o) => <option key={o.value} value={o.value}>{o.text}</option>)}</Select></FilterItem>
        </FilterBar>
      </PageHeader>
      {error ? <ErrorNotice /> : rows.length === 0 ? <div className="rounded-md border border-line bg-white"><EmptyState>No hay siniestros abiertos.</EmptyState></div> : (
        <>
          <Table><thead><tr><Th>Póliza</Th><Th>Cliente</Th><Th>Fecha del evento</Th><Th>N.º de siniestro</Th><Th>Estatus</Th><Th /></tr></thead><tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <Td><Link href={`/polizas/${c.policy_id}`} className="font-medium text-primary">{c.policies?.policy_number ?? '—'}</Link></Td>
                <Td>{c.clients?.full_name ?? 'Cliente reasignado'}</Td><Td>{formatBusinessDate(c.event_date)}</Td><Td>{c.insurer_claim_number ?? '—'}</Td>
                <Td><StatusBadge status={c.status} labels={LABELS.claim} /></Td>
                <Td className="text-right"><FormModal title="Cambiar estatus del siniestro" triggerLabel="Estatus" triggerVariant="outline" triggerSize="sm" action={updateClaimStatus} submitLabel="Guardar" pendingLabel="Guardando…">
                  <input type="hidden" name="id" value={c.id} /><ClaimStatusFields current={c.status} /></FormModal></Td>
              </tr>
            ))}</tbody></Table>
          <Pagination page={page} total={count ?? 0} path="/siniestros" params={{ estatus: sp.estatus }} />
        </>
      )}
    </>
  )
}
