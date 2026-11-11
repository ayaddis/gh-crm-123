import { createClient } from '@/lib/supabase/server'
import { formatPhone } from '@/lib/phone'
import { Screen } from '@/components/layout/screen'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState, ErrorNotice } from '@/components/page-state'
import { FormModal } from '@/components/form-modal'
import { SelectField } from '@/components/field'
import { reassignClient } from '../_actions/reassign'
import Link from 'next/link'

const clean = (s: string) => s.replace(/[,()%*\\]/g, ' ').trim()

export default async function BuscarPage({ searchParams }: { searchParams: Promise<{ q?: string; c?: string }> }) {
  const sp = await searchParams
  const q = clean(sp.q ?? '')
  const supabase = await createClient()
  const { data: people } = await supabase.from('profiles').select('id, full_name').eq('is_active', true).order('full_name')
  const names = new Map((people ?? []).map((p) => [p.id, p.full_name]))

  let results: { id: string; full_name: string; phone: string; owner_id: string }[] = []
  let failed = false
  if (q.length >= 3) {
    const digits = q.replace(/\D/g, '')
    const { data, error } = await supabase.from('clients').select('id, full_name, phone, owner_id').is('archived_at', null)
      .or(digits.length >= 3 ? `full_name.ilike.%${q}%,phone.like.%${digits}%` : `full_name.ilike.%${q}%`).order('full_name').limit(25)
    failed = !!error
    results = data ?? []
  }
  const selected = sp.c && /^[0-9a-f-]{36}$/i.test(sp.c) ? results.find((r) => r.id === sp.c) : undefined
  const { count: openOpps } = selected
    ? await supabase.from('opportunities').select('id', { count: 'exact', head: true }).eq('client_id', selected.id).is('archived_at', null).in('stage', ['nuevo', 'contactado', 'cotizacion_enviada', 'negociacion'])
    : { count: 0 }

  return (
    <Screen title="Buscar">
      <form method="get" className="flex gap-2">
        <Input name="q" defaultValue={sp.q ?? ''} placeholder="Nombre o teléfono" aria-label="Buscar cliente por nombre o teléfono" className="flex-1" />
        <Button type="submit" size="lg">Buscar</Button>
      </form>
      {q.length > 0 && q.length < 3 && <p className="text-sm text-ink-soft">Escribe al menos 3 caracteres.</p>}
      {failed ? <ErrorNotice /> : q.length >= 3 && results.length === 0 ? <Card><EmptyState>No encontramos clientes con esa búsqueda.</EmptyState></Card> : null}

      {selected && (
        <Card className="border-primary"><CardContent className="space-y-3 p-3.5">
          <div>
            <p className="text-[17px] font-semibold">{selected.full_name}</p>
            <p className="text-base">{formatPhone(selected.phone)}</p>
            <p className="text-sm text-ink-soft">Responsable: {names.get(selected.owner_id) ?? '—'} · {openOpps ?? 0} oportunidades abiertas</p>
          </div>
          <FormModal title="Reasignar cliente" triggerLabel="Reasignar" triggerSize="lg" action={reassignClient} submitLabel="Reasignar" pendingLabel="Reasignando…">
            <input type="hidden" name="client_id" value={selected.id} />
            <SelectField label="Nuevo responsable" name="new_owner_id" placeholder="Selecciona…" options={(people ?? []).filter((p) => p.id !== selected.owner_id).map((p) => ({ value: p.id, text: p.full_name }))} required />
            <p className="rounded-md bg-warn-bg px-3 py-2 text-sm text-warn-fg">Se moverán también sus oportunidades, seguimientos pendientes y pólizas vigentes. Las comisiones ya generadas conservan a su ejecutivo original.</p>
          </FormModal>
        </CardContent></Card>
      )}

      {results.map((r) => (
        <Link key={r.id} href={`/buscar?q=${encodeURIComponent(sp.q ?? '')}&c=${r.id}`} className="block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <Card><CardContent className="p-3.5">
            <p className="text-base font-semibold">{r.full_name}</p>
            <p className="text-sm">{formatPhone(r.phone)}</p>
            <p className="text-sm text-ink-soft">Responsable: {names.get(r.owner_id) ?? '—'}</p>
          </CardContent></Card>
        </Link>
      ))}
    </Screen>
  )
}
