import Link from 'next/link'
import { getCurrentProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { formatBusinessDate, formatMXN, todayMxIso } from '@/lib/format'
import { BOARD_STAGES, LABELS, OPEN_STAGES } from '@/lib/labels'
import { Card } from '@/components/ui/card'
import { Table, Th, Td } from '@/components/ui/table'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/status-badge'
import { EmptyState, ErrorNotice, PageHeader } from '@/components/page-state'
import { FilterBar, FilterItem } from '@/components/filter-bar'
import { Pagination, pageRange, parsePage } from '@/components/pagination'
import { FormModal } from '@/components/form-modal'
import { StageFields } from '@/components/forms/stage-fields'
import { changeStage } from '../_actions/opportunities'

type SP = { vista?: string; producto?: string; responsable?: string; archivadas?: string; page?: string }
type Row = { id: string; stage: string; estimated_annual_premium: number; estimated_close_date: string | null; owner_id: string; archived_at: string | null; clients: { full_name: string } | null; products: { name: string } | null }

export default async function OportunidadesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const profile = await getCurrentProfile()
  if (!profile) return null
  const isSup = profile.role === 'supervisor'
  const sp = await searchParams
  const table = sp.vista === 'tabla'
  const page = parsePage(sp.page)
  const supabase = await createClient()
  const monthStart = `${todayMxIso().slice(0, 7)}-01`

  let q = supabase.from('opportunities').select('id, stage, estimated_annual_premium, estimated_close_date, owner_id, archived_at, clients(full_name), products(name)', { count: 'exact' })
  if (sp.archivadas !== '1') q = q.is('archived_at', null)
  if (sp.producto) q = q.eq('product_id', sp.producto)
  if (isSup && sp.responsable) q = q.eq('owner_id', sp.responsable)
  if (table) q = q.order('created_at', { ascending: false }).range(pageRange(page).from, pageRange(page).to)
  else q = q.or(`stage.in.(${OPEN_STAGES.join(',')}),closed_at.gte.${monthStart}T00:00:00-06:00`).order('created_at', { ascending: false }).limit(300)
  const { data, count, error } = await q
  const rows = (data ?? []) as unknown as Row[]

  const [products, owners] = await Promise.all([
    supabase.from('products').select('id, name').order('name'),
    isSup ? supabase.from('profiles').select('id, full_name').eq('is_active', true).order('full_name') : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
  ])
  const ownerName = new Map((owners.data ?? []).map((o) => [o.id, o.full_name]))
  const toggle = (v: string) => `/oportunidades?${new URLSearchParams({ vista: v, ...(sp.producto ? { producto: sp.producto } : {}), ...(sp.responsable ? { responsable: sp.responsable } : {}), ...(sp.archivadas ? { archivadas: sp.archivadas } : {}) })}`

  const stageMenu = (o: Row) => (
    <FormModal title="Cambiar etapa" triggerLabel="Etapa" triggerVariant="outline" triggerSize="sm" action={changeStage} submitLabel="Guardar" pendingLabel="Guardando…">
      <input type="hidden" name="id" value={o.id} /><StageFields current={o.stage} />
    </FormModal>
  )

  return (
    <>
      <PageHeader title="Oportunidades" action={
        <div className="flex rounded-md border border-line bg-white p-0.5 text-[13px]" role="group" aria-label="Vista">
          <Link href={toggle('tablero')} aria-current={!table ? 'true' : undefined} className={`rounded-sm px-3 py-1 ${!table ? 'bg-neutral-bg font-medium' : 'text-ink-soft'}`}>Tablero</Link>
          <Link href={toggle('tabla')} aria-current={table ? 'true' : undefined} className={`rounded-sm px-3 py-1 ${table ? 'bg-neutral-bg font-medium' : 'text-ink-soft'}`}>Tabla</Link>
        </div>
      }>
        <FilterBar action="/oportunidades">
          <input type="hidden" name="vista" value={table ? 'tabla' : 'tablero'} />
          <FilterItem label="Producto"><Select name="producto" defaultValue={sp.producto ?? ''}><option value="">Todos</option>{(products.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></FilterItem>
          {isSup && <FilterItem label="Responsable"><Select name="responsable" defaultValue={sp.responsable ?? ''}><option value="">Todos</option>{(owners.data ?? []).map((o) => <option key={o.id} value={o.id}>{o.full_name}</option>)}</Select></FilterItem>}
          <label className="flex h-9 items-center gap-2 text-[13px]"><input type="checkbox" name="archivadas" value="1" defaultChecked={sp.archivadas === '1'} /> Archivadas</label>
        </FilterBar>
      </PageHeader>

      {error ? <ErrorNotice /> : !table ? (
        rows.length === 0 ? <div className="rounded-md border border-line bg-white"><EmptyState>Aún no hay oportunidades.</EmptyState></div> : (
          <div className="grid gap-3 overflow-x-auto [grid-template-columns:repeat(4,minmax(220px,1fr))_repeat(2,minmax(160px,0.7fr))]">
            {BOARD_STAGES.map((stage) => {
              const col = rows.filter((r) => r.stage === stage)
              const total = col.reduce((a, r) => a + Number(r.estimated_annual_premium), 0)
              return (
                <section key={stage} aria-label={LABELS.stage[stage]} className="space-y-2">
                  <header className="flex items-center justify-between"><StatusBadge status={stage} labels={LABELS.stage} /><span className="text-xs text-ink-soft">{col.length} · {formatMXN(total)}</span></header>
                  {stage === 'ganada' || stage === 'perdida' ? <p className="text-[11px] text-ink-mute">Del mes</p> : null}
                  {col.map((o) => (
                    <Card key={o.id} className="space-y-1 p-3 text-[13px]">
                      <Link href={`/oportunidades/${o.id}`} className="font-medium text-primary">{o.clients?.full_name ?? '—'}</Link>
                      <p className="text-ink-soft">{o.products?.name} · {formatMXN(Number(o.estimated_annual_premium))}</p>
                      {o.estimated_close_date && <p className="text-xs text-ink-soft">Cierre: {formatBusinessDate(o.estimated_close_date)}</p>}
                      {isSup && <p className="text-xs text-ink-soft">{ownerName.get(o.owner_id) ?? ''}</p>}
                      {o.archived_at ? <Badge variant="neutral">Archivada</Badge> : (stage !== 'ganada' && stage !== 'perdida') && stageMenu(o)}
                    </Card>
                  ))}
                </section>
              )
            })}
          </div>
        )
      ) : rows.length === 0 ? <div className="rounded-md border border-line bg-white"><EmptyState>Aún no hay oportunidades.</EmptyState></div> : (
        <>
          <Table><thead><tr><Th>Cliente</Th><Th>Producto</Th><Th>Etapa</Th><Th className="text-right">Prima estimada</Th><Th>Cierre estimado</Th>{isSup && <Th>Responsable</Th>}</tr></thead><tbody>
            {rows.map((o) => (
              <tr key={o.id}>
                <Td><Link href={`/oportunidades/${o.id}`} className="font-medium text-primary">{o.clients?.full_name ?? '—'}</Link>{o.archived_at && <Badge variant="neutral" className="ml-2">Archivada</Badge>}</Td>
                <Td>{o.products?.name}</Td><Td><StatusBadge status={o.stage} labels={LABELS.stage} /></Td>
                <Td className="text-right tabular-nums">{formatMXN(Number(o.estimated_annual_premium))}</Td>
                <Td>{o.estimated_close_date ? formatBusinessDate(o.estimated_close_date) : '—'}</Td>
                {isSup && <Td>{ownerName.get(o.owner_id) ?? '—'}</Td>}
              </tr>
            ))}</tbody></Table>
          <Pagination page={page} total={count ?? 0} path="/oportunidades" params={{ vista: 'tabla', producto: sp.producto, responsable: sp.responsable, archivadas: sp.archivadas }} />
        </>
      )}
    </>
  )
}
