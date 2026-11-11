import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCurrentProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { formatPhone } from '@/lib/phone'
import { formatBusinessDate, formatMXN, todayMxIso } from '@/lib/format'
import { LABELS, label } from '@/lib/labels'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, Th, Td } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/status-badge'
import { EmptyState, ErrorNotice } from '@/components/page-state'
import { FormModal } from '@/components/form-modal'
import { InlineAction } from '@/components/inline-action'
import { ActivityFields, ClientFields, FollowUpFields, OpportunityFields } from '@/components/forms/fields'
import { archiveClient, updateClient } from '../../_actions/clients'
import { addActivity } from '../../_actions/activities'
import { cancelFollowUp, completeFollowUp, createFollowUp } from '../../_actions/follow-ups'
import { createOpportunity } from '../../_actions/opportunities'

const TABS = [
  ['resumen', 'Resumen'], ['oportunidades', 'Oportunidades'], ['polizas', 'Pólizas'], ['actividad', 'Actividad'], ['seguimientos', 'Seguimientos'],
] as const

export default async function FichaPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const profile = await getCurrentProfile()
  if (!profile) return null
  const { id } = await params
  const sp = await searchParams
  const tab = TABS.find(([k]) => k === sp.tab)?.[0] ?? 'resumen'
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()

  const supabase = await createClient()
  const { data: client, error } = await supabase.from('clients').select('*').eq('id', id).maybeSingle()
  if (error) return <ErrorNotice />
  if (!client) notFound()

  const [opps, policies, acts, fups, products, owner] = await Promise.all([
    supabase.from('opportunities').select('id, stage, estimated_annual_premium, estimated_close_date, archived_at, products(name)').eq('client_id', id).order('created_at', { ascending: false }),
    supabase.from('v_policies').select('id, policy_number, product_name, insurer_name, annual_premium, start_date, end_date, effective_status').eq('client_id', id).order('created_at', { ascending: false }),
    supabase.from('activities').select('id, type, summary, occurred_at').eq('client_id', id).order('occurred_at', { ascending: false }).limit(50),
    supabase.from('v_follow_ups').select('id, due_date, note, status, is_overdue').eq('client_id', id).order('due_date', { ascending: false }),
    supabase.from('products').select('id, name').eq('is_active', true).order('name'),
    supabase.from('profiles').select('id, full_name').eq('id', client.owner_id).maybeSingle(),
  ])
  const productOpts = (products.data ?? []).map((p) => ({ value: p.id, text: p.name }))
  const archived = !!client.archived_at
  const today = todayMxIso()
  const dt = (iso: string) => new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Mexico_City' }).format(new Date(iso))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/clientes" className="text-xs text-primary">← Clientes</Link>
          <h1 className="text-[22px] font-semibold">{client.full_name} {archived && <Badge variant="neutral">Archivado</Badge>}</h1>
          <p className="text-sm text-ink-soft">
            {formatPhone(client.phone)}{client.email ? ` · ${client.email}` : ''}{client.company ? ` · ${client.company}` : ''}{client.city_state ? ` · ${client.city_state}` : ''}
          </p>
          <p className="text-xs text-ink-soft">Origen: {label(LABELS.source, client.source)} · Responsable: {owner.data?.full_name ?? '—'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!archived && (
            <>
              <FormModal title="Registrar actividad" triggerLabel="Registrar actividad" triggerVariant="outline" action={addActivity} submitLabel="Guardar" pendingLabel="Guardando…">
                <input type="hidden" name="client_id" value={id} /><ActivityFields />
              </FormModal>
              <FormModal title="Nuevo seguimiento" triggerLabel="Nuevo seguimiento" triggerVariant="outline" action={createFollowUp} submitLabel="Guardar" pendingLabel="Guardando…">
                <input type="hidden" name="client_id" value={id} /><FollowUpFields minDate={today} />
              </FormModal>
              <FormModal title="Nueva oportunidad" triggerLabel="Nueva oportunidad" triggerVariant="outline" action={createOpportunity} submitLabel="Guardar" pendingLabel="Guardando…">
                <input type="hidden" name="client_id" value={id} /><OpportunityFields products={productOpts} />
              </FormModal>
              <FormModal title="Editar cliente" triggerLabel="Editar" triggerVariant="outline" kind="drawer" action={updateClient} submitLabel="Guardar" pendingLabel="Guardando…">
                <input type="hidden" name="id" value={id} /><ClientFields client={client} />
              </FormModal>
              <FormModal title="Archivar cliente" triggerLabel="Archivar" triggerVariant="outline" action={archiveClient} submitLabel="Archivar" pendingLabel="Archivando…">
                <input type="hidden" name="id" value={id} />
                <p className="text-sm">El cliente dejará de aparecer en la lista principal. Podrás verlo activando el filtro “Archivados”.</p>
              </FormModal>
            </>
          )}
        </div>
      </div>

      <nav aria-label="Secciones" className="flex gap-1 border-b border-line">
        {TABS.map(([k, text]) => (
          <Link key={k} href={`/clientes/${id}?tab=${k}`} aria-current={tab === k ? 'page' : undefined}
            className={`-mb-px border-b-2 px-3 py-2 text-[13px] font-medium ${tab === k ? 'border-primary text-primary' : 'border-transparent text-ink-soft hover:text-ink'}`}>
            {text}
          </Link>
        ))}
      </nav>

      {tab === 'resumen' && (
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(440px,100%),1fr))]">
          <Card><CardHeader><CardTitle>Notas</CardTitle></CardHeader><CardContent className="whitespace-pre-wrap text-[13px]">{client.notes ?? <span className="text-ink-soft">Sin notas.</span>}</CardContent></Card>
          <Card><CardHeader><CardTitle>Últimos movimientos</CardTitle></CardHeader>
            {(acts.data ?? []).length === 0 ? <EmptyState>Aún no hay actividad registrada.</EmptyState> : (
              <ul>{acts.data!.slice(0, 5).map((a) => (
                <li key={a.id} className="border-b border-rowline px-4 py-2 text-[13px] last:border-0"><span className="font-medium">{label(LABELS.activity, a.type)}</span> · <span className="text-ink-soft">{dt(a.occurred_at)}</span><p>{a.summary}</p></li>
              ))}</ul>
            )}
          </Card>
        </div>
      )}

      {tab === 'oportunidades' && ((opps.data ?? []).length === 0 ? <div className="rounded-md border border-line bg-white"><EmptyState>Aún no hay oportunidades.</EmptyState></div> : (
        <Table><thead><tr><Th>Producto</Th><Th>Etapa</Th><Th className="text-right">Prima estimada</Th><Th>Cierre estimado</Th></tr></thead><tbody>
          {opps.data!.map((o) => (
            <tr key={o.id}>
              <Td><Link href={`/oportunidades/${o.id}`} className="font-medium text-primary">{(o.products as { name: string } | null)?.name ?? '—'}</Link>{o.archived_at && <Badge variant="neutral" className="ml-2">Archivada</Badge>}</Td>
              <Td><StatusBadge status={o.stage} labels={LABELS.stage} /></Td>
              <Td className="text-right tabular-nums">{formatMXN(Number(o.estimated_annual_premium))}</Td>
              <Td>{o.estimated_close_date ? formatBusinessDate(o.estimated_close_date) : '—'}</Td>
            </tr>
          ))}</tbody></Table>
      ))}

      {tab === 'polizas' && ((policies.data ?? []).length === 0 ? <div className="rounded-md border border-line bg-white"><EmptyState>Aún no hay pólizas.</EmptyState></div> : (
        <Table><thead><tr><Th>N.º de póliza</Th><Th>Producto</Th><Th>Aseguradora</Th><Th className="text-right">Prima anual</Th><Th>Vigencia</Th><Th>Estatus</Th></tr></thead><tbody>
          {policies.data!.map((p) => (
            <tr key={p.id}>
              <Td><Link href={`/polizas/${p.id}`} className="font-medium text-primary">{p.policy_number}</Link></Td><Td>{p.product_name}</Td><Td>{p.insurer_name}</Td>
              <Td className="text-right tabular-nums">{formatMXN(Number(p.annual_premium))}</Td>
              <Td>{formatBusinessDate(p.start_date!)} – {formatBusinessDate(p.end_date!)}</Td>
              <Td><StatusBadge status={p.effective_status} labels={LABELS.policy} /></Td>
            </tr>
          ))}</tbody></Table>
      ))}

      {tab === 'actividad' && (
        <Card>{(acts.data ?? []).length === 0 ? <EmptyState>Aún no hay actividad registrada.</EmptyState> : (
          <ul>{acts.data!.map((a) => (
            <li key={a.id} className="border-b border-rowline px-4 py-2.5 text-[13px] last:border-0"><Badge variant="info">{label(LABELS.activity, a.type)}</Badge> <span className="text-ink-soft">{dt(a.occurred_at)}</span><p className="mt-1 whitespace-pre-wrap">{a.summary}</p></li>
          ))}</ul>
        )}</Card>
      )}

      {tab === 'seguimientos' && (
        <Card>{(fups.data ?? []).length === 0 ? <EmptyState>No hay seguimientos.</EmptyState> : (
          <ul>{fups.data!.map((f) => (
            <li key={f.id} className="flex items-center justify-between gap-3 border-b border-rowline px-4 py-2.5 text-[13px] last:border-0">
              <div><span className="font-medium">{formatBusinessDate(f.due_date!)}</span> <StatusBadge status={f.is_overdue ? 'vencido' : f.status} labels={{ ...LABELS.followUp, vencido: 'Vencido' }} /><p className="text-ink-soft">{f.note ?? 'Sin nota'}</p></div>
              {f.status === 'pendiente' && (
                <div className="flex gap-2">
                  <InlineAction action={completeFollowUp} fields={{ id: f.id!, client_id: id }} label="Marcar hecho" pendingLabel="Guardando…" />
                  <FormModal title="Cancelar seguimiento" triggerLabel="Cancelar" triggerVariant="outline" triggerSize="sm" action={cancelFollowUp} submitLabel="Cancelar seguimiento" pendingLabel="Cancelando…" cancelLabel="Volver">
                    <input type="hidden" name="id" value={f.id!} /><input type="hidden" name="client_id" value={id} />
                    <p className="text-sm">¿Cancelar este seguimiento?</p>
                  </FormModal>
                </div>
              )}
            </li>
          ))}</ul>
        )}</Card>
      )}
    </div>
  )
}
