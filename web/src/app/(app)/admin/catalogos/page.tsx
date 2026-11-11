import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatPhone } from '@/lib/phone'
import { Table, Th, Td } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { EmptyState, ErrorNotice, PageHeader } from '@/components/page-state'
import { FormModal } from '@/components/form-modal'
import { TextField } from '@/components/field'
import { saveAgent, saveInsurer, saveProduct } from './actions'

const TABS = [['productos', 'Productos'], ['aseguradoras', 'Aseguradoras'], ['agentes', 'Agentes']] as const

type Item = { id: string; name: string; is_active: boolean; phone?: string }

export default async function CatalogosPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const sp = await searchParams
  const tab = TABS.find(([k]) => k === sp.tab)?.[0] ?? 'productos'
  const supabase = await createClient()
  let items: Item[] = []
  let failed = false
  if (tab === 'agentes') {
    const { data, error } = await supabase.from('agents').select('id, full_name, phone, is_active').order('full_name')
    failed = !!error
    items = (data ?? []).map((a) => ({ id: a.id, name: a.full_name, phone: a.phone, is_active: a.is_active }))
  } else {
    const { data, error } = await supabase.from(tab === 'productos' ? 'products' : 'insurers').select('id, name, is_active').order('name')
    failed = !!error
    items = data ?? []
  }
  const action = tab === 'productos' ? saveProduct : tab === 'aseguradoras' ? saveInsurer : saveAgent
  const singular = tab === 'productos' ? 'producto' : tab === 'aseguradoras' ? 'aseguradora' : 'agente'

  const fields = (it?: Item) => (
    <>
      {it && <input type="hidden" name="id" value={it.id} />}
      <TextField label={tab === 'agentes' ? 'Nombre completo' : 'Nombre'} name={tab === 'agentes' ? 'full_name' : 'name'} defaultValue={it?.name} maxLength={120} required />
      {tab === 'agentes' && <TextField label="Teléfono" name="phone" defaultValue={it?.phone} inputMode="tel" hint="10 dígitos" required />}
    </>
  )

  return (
    <>
      <PageHeader title="Catálogos" action={<FormModal title={`Nuevo ${singular}`} triggerLabel="Nuevo" action={action} submitLabel="Guardar" pendingLabel="Guardando…">{fields()}</FormModal>}>
        <nav aria-label="Catálogos" className="flex gap-1 border-b border-line">
          {TABS.map(([k, text]) => <Link key={k} href={`/admin/catalogos?tab=${k}`} aria-current={tab === k ? 'page' : undefined} className={`-mb-px border-b-2 px-3 py-2 text-[13px] font-medium ${tab === k ? 'border-primary text-primary' : 'border-transparent text-ink-soft'}`}>{text}</Link>)}
        </nav>
      </PageHeader>
      {failed ? <ErrorNotice /> : items.length === 0 ? <div className="rounded-md border border-line bg-white"><EmptyState>Aún no hay registros.</EmptyState></div> : (
        <Table><thead><tr><Th>Nombre</Th>{tab === 'agentes' && <Th>Teléfono</Th>}<Th>Estado</Th><Th /></tr></thead><tbody>
          {items.map((it) => (
            <tr key={it.id}>
              <Td className="font-medium">{it.name}</Td>{tab === 'agentes' && <Td>{formatPhone(it.phone ?? '')}</Td>}
              <Td><Badge variant={it.is_active ? 'positive' : 'neutral'}>{it.is_active ? 'Activo' : 'Inactivo'}</Badge></Td>
              <Td className="text-right"><div className="flex justify-end gap-2">
                <FormModal title={`Editar ${singular}`} triggerLabel="Editar" triggerVariant="outline" triggerSize="sm" kind="drawer" action={action} submitLabel="Guardar" pendingLabel="Guardando…">{fields(it)}</FormModal>
                <FormModal title={it.is_active ? `Desactivar ${singular}` : `Reactivar ${singular}`} triggerLabel={it.is_active ? 'Desactivar' : 'Reactivar'} triggerVariant="outline" triggerSize="sm" action={action} submitLabel={it.is_active ? 'Desactivar' : 'Reactivar'} pendingLabel="Guardando…">
                  <input type="hidden" name="id" value={it.id} /><input type="hidden" name={tab === 'agentes' ? 'full_name' : 'name'} value={it.name} />
                  {tab === 'agentes' && <input type="hidden" name="phone" value={it.phone ?? ''} />}
                  <input type="hidden" name="is_active" value={String(!it.is_active)} />
                  <p className="text-sm">{it.is_active ? 'Dejará de ofrecerse en formularios nuevos. Lo ya registrado se conserva.' : 'Volverá a ofrecerse en formularios nuevos.'}</p>
                </FormModal>
              </div></Td>
            </tr>
          ))}</tbody></Table>
      )}
    </>
  )
}
