import { createClient } from '@/lib/supabase/server'
import { AUDIT_ACTIONS, AUDIT_TYPES, eventLabel, tableLabel } from '@/lib/audit'
import { Table, Th, Td } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { EmptyState, ErrorNotice, PageHeader } from '@/components/page-state'
import { FilterBar, FilterItem } from '@/components/filter-bar'
import { Pagination, pageRange, parsePage } from '@/components/pagination'
import { AuditDetail } from '@/components/audit-detail'

type SP = { desde?: string; hasta?: string; tipo?: string; accion?: string; persona?: string; page?: string }
const isDate = (v?: string) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v)

export default async function HistorialPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams
  const page = parsePage(sp.page)
  const supabase = await createClient()

  // Solo lectura: sin opciones para editar ni quitar registros.
  let q = supabase.from('audit_log').select('id, created_at, actor_id, action, event, table_name, record_id, old_data, new_data, details', { count: 'exact' })
    .order('created_at', { ascending: false }).range(pageRange(page).from, pageRange(page).to)
  if (isDate(sp.desde)) q = q.gte('created_at', `${sp.desde}T00:00:00-06:00`)
  if (isDate(sp.hasta)) q = q.lte('created_at', `${sp.hasta}T23:59:59-06:00`)
  const type = sp.tipo ? AUDIT_TYPES[sp.tipo] : undefined
  if (type) q = type.tables.length ? q.in('table_name', type.tables) : q.eq('action', 'event')
  if (sp.accion && sp.accion in AUDIT_ACTIONS) q = q.eq('action', sp.accion)
  if (sp.persona && /^[0-9a-f-]{36}$/i.test(sp.persona)) q = q.eq('actor_id', sp.persona)
  const { data, count, error } = await q
  const { data: people } = await supabase.from('profiles').select('id, full_name').order('full_name')
  const names = new Map((people ?? []).map((p) => [p.id, p.full_name]))
  const dt = (iso: string) => new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'medium', timeZone: 'America/Mexico_City' }).format(new Date(iso))

  return (
    <>
      <PageHeader title="Historial">
        <FilterBar action="/admin/historial">
          <FilterItem label="Desde"><Input type="date" name="desde" defaultValue={sp.desde ?? ''} /></FilterItem>
          <FilterItem label="Hasta"><Input type="date" name="hasta" defaultValue={sp.hasta ?? ''} /></FilterItem>
          <FilterItem label="Tipo de dato"><Select name="tipo" defaultValue={sp.tipo ?? ''}><option value="">Todos</option>{Object.entries(AUDIT_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Select></FilterItem>
          <FilterItem label="Acción"><Select name="accion" defaultValue={sp.accion ?? ''}><option value="">Todas</option>{Object.entries(AUDIT_ACTIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></FilterItem>
          <FilterItem label="Persona"><Select name="persona" defaultValue={sp.persona ?? ''}><option value="">Todas</option>{(people ?? []).map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}</Select></FilterItem>
        </FilterBar>
      </PageHeader>
      {error ? <ErrorNotice /> : (data ?? []).length === 0 ? <div className="rounded-md border border-line bg-white"><EmptyState>No hay registros con esos filtros.</EmptyState></div> : (
        <>
          <Table><thead><tr><Th>Fecha y hora</Th><Th>Persona</Th><Th>Acción</Th><Th>Dato afectado</Th><Th /></tr></thead><tbody>
            {data!.map((r) => (
              <tr key={r.id}>
                <Td className="whitespace-nowrap">{dt(r.created_at)}</Td>
                <Td>{r.actor_id ? (names.get(r.actor_id) ?? '—') : 'Sistema'}</Td>
                <Td>{AUDIT_ACTIONS[r.action] ?? r.action}{r.event ? ` · ${eventLabel(r.event)}` : ''}</Td>
                <Td>{tableLabel(r.table_name)}{r.record_id ? <span className="ml-1 text-xs text-ink-mute">{r.record_id.slice(0, 8)}</span> : null}</Td>
                <Td className="text-right"><AuditDetail oldData={r.old_data as Record<string, unknown> | null} newData={r.new_data as Record<string, unknown> | null} details={r.details as Record<string, unknown> | null} /></Td>
              </tr>
            ))}</tbody></Table>
          <Pagination page={page} total={count ?? 0} path="/admin/historial" params={{ desde: sp.desde, hasta: sp.hasta, tipo: sp.tipo, accion: sp.accion, persona: sp.persona }} />
        </>
      )}
    </>
  )
}
