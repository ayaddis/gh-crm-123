import Link from 'next/link'
import { getCurrentProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { formatPhone } from '@/lib/phone'
import { LABELS, OPEN_STAGES, label } from '@/lib/labels'
import { Table, Th, Td } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { EmptyState, ErrorNotice, PageHeader } from '@/components/page-state'
import { FilterBar, FilterItem } from '@/components/filter-bar'
import { Pagination, pageRange, parsePage } from '@/components/pagination'
import { FormModal } from '@/components/form-modal'
import { ClientFields } from '@/components/forms/fields'
import { createClient as createClientAction } from '../_actions/clients'

type SP = { q?: string; responsable?: string; archivados?: string; page?: string }

/** Quita caracteres con significado en filtros de PostgREST. */
const clean = (s: string) => s.replace(/[,()%*\\]/g, ' ').trim()

export default async function ClientesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const profile = await getCurrentProfile()
  if (!profile) return null
  const isSup = profile.role === 'supervisor'
  const sp = await searchParams
  const page = parsePage(sp.page)
  const q = clean(sp.q ?? '')
  const supabase = await createClient()

  let query = supabase
    .from('clients')
    .select('id, full_name, phone, company, city_state, source, owner_id, archived_at', { count: 'exact' })
    .order('full_name')
    .range(pageRange(page).from, pageRange(page).to)
  if (sp.archivados !== '1') query = query.is('archived_at', null)
  if (isSup && sp.responsable) query = query.eq('owner_id', sp.responsable)
  if (q.length >= 3) {
    const digits = q.replace(/\D/g, '')
    query = query.or(digits.length >= 3 ? `full_name.ilike.%${q}%,phone.like.%${digits}%` : `full_name.ilike.%${q}%`)
  }
  const { data: clients, count, error } = await query

  const owners = isSup ? ((await supabase.from('profiles').select('id, full_name').eq('is_active', true).order('full_name')).data ?? []) : []
  const ownerName = new Map(owners.map((o) => [o.id, o.full_name]))
  const ids = (clients ?? []).map((c) => c.id)
  const openCount = new Map<string, number>()
  if (ids.length) {
    const { data: opps } = await supabase.from('opportunities').select('client_id').in('client_id', ids).is('archived_at', null).in('stage', [...OPEN_STAGES])
    for (const o of opps ?? []) openCount.set(o.client_id, (openCount.get(o.client_id) ?? 0) + 1)
  }

  return (
    <>
      <PageHeader
        title="Clientes"
        action={
          <FormModal title="Nuevo cliente" triggerLabel="Nuevo cliente" kind="drawer" action={createClientAction} submitLabel="Guardar" pendingLabel="Guardando…">
            <ClientFields owners={isSup ? owners.map((o) => ({ value: o.id, text: o.full_name })) : undefined} />
          </FormModal>
        }
      >
        <FilterBar action="/clientes">
          <FilterItem label="Buscar (nombre o teléfono, mínimo 3 caracteres)" className="w-80">
            <Input name="q" defaultValue={sp.q ?? ''} aria-label="Buscar cliente" />
          </FilterItem>
          {isSup && (
            <FilterItem label="Responsable">
              <Select name="responsable" defaultValue={sp.responsable ?? ''}>
                <option value="">Todos</option>
                {owners.map((o) => <option key={o.id} value={o.id}>{o.full_name}</option>)}
              </Select>
            </FilterItem>
          )}
          <label className="flex h-9 items-center gap-2 text-[13px]">
            <input type="checkbox" name="archivados" value="1" defaultChecked={sp.archivados === '1'} /> Archivados
          </label>
        </FilterBar>
      </PageHeader>

      {error ? <ErrorNotice /> : (clients ?? []).length === 0 ? (
        <div className="rounded-md border border-line bg-white">
          <EmptyState>{q || sp.responsable ? 'No hay clientes con esos filtros.' : <>Aún no hay clientes. Crea el primero con <strong>Nuevo cliente</strong>.</>}</EmptyState>
        </div>
      ) : (
        <>
          <Table>
            <thead><tr>
              <Th>Nombre</Th><Th>Teléfono</Th><Th>Empresa</Th><Th>Ciudad/Estado</Th><Th>Origen</Th>
              {isSup && <Th>Responsable</Th>}<Th className="text-right">Oportunidades abiertas</Th>
            </tr></thead>
            <tbody>
              {clients!.map((c) => (
                <tr key={c.id} className="hover:bg-page">
                  <Td>
                    <Link href={`/clientes/${c.id}`} className="font-medium text-primary hover:text-primary-hover">{c.full_name}</Link>
                    {c.archived_at && <Badge variant="neutral" className="ml-2">Archivado</Badge>}
                  </Td>
                  <Td>{formatPhone(c.phone)}</Td><Td>{c.company ?? '—'}</Td><Td>{c.city_state ?? '—'}</Td>
                  <Td>{label(LABELS.source, c.source)}</Td>
                  {isSup && <Td>{ownerName.get(c.owner_id) ?? '—'}</Td>}
                  <Td className="text-right tabular-nums">{openCount.get(c.id) ?? 0}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Pagination page={page} total={count ?? 0} path="/clientes" params={{ q: sp.q, responsable: sp.responsable, archivados: sp.archivados }} />
        </>
      )}
    </>
  )
}
