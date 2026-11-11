import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatBusinessDate, formatMXN, todayMxIso } from '@/lib/format'
import { LABELS } from '@/lib/labels'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/status-badge'
import { ErrorNotice } from '@/components/page-state'
import { FormModal } from '@/components/form-modal'
import { ActivityFields, FollowUpFields, OpportunityFields } from '@/components/forms/fields'
import { StageFields } from '@/components/forms/stage-fields'
import { IssuePolicyFields } from '@/components/forms/issue-policy-fields'
import { addActivity } from '../../_actions/activities'
import { createFollowUp } from '../../_actions/follow-ups'
import { archiveOpportunity, changeStage, updateOpportunity } from '../../_actions/opportunities'
import { issuePolicy } from '../../_actions/policies'


export default async function OportunidadPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ emitir?: string }> }) {
  const { id } = await params
  const sp = await searchParams
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const supabase = await createClient()
  const { data: opp, error } = await supabase.from('opportunities').select('*, clients(id, full_name, phone), products(name)').eq('id', id).maybeSingle()
  if (error) return <ErrorNotice />
  if (!opp) notFound()

  const [activePolicy, owner, products, insurers, agents] = await Promise.all([
    supabase.from('policies').select('id, policy_number').eq('opportunity_id', id).neq('status', 'cancelada').maybeSingle(),
    supabase.from('profiles').select('full_name').eq('id', opp.owner_id).maybeSingle(),
    supabase.from('products').select('id, name').eq('is_active', true).order('name'),
    supabase.from('insurers').select('id, name').eq('is_active', true).order('name'),
    supabase.from('agents').select('id, full_name').eq('is_active', true).order('full_name'),
  ])
  const client = opp.clients as { id: string; full_name: string; phone: string } | null
  const productName = (opp.products as { name: string } | null)?.name ?? '—'
  const today = todayMxIso()
  const archived = !!opp.archived_at
  const canIssue = opp.stage === 'ganada' && !activePolicy.data && !archived
  const dt = (iso: string) => new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Mexico_City' }).format(new Date(iso))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/oportunidades" className="text-xs text-primary">← Oportunidades</Link>
          <h1 className="text-[22px] font-semibold">{client?.full_name ?? '—'} · {productName} {archived && <Badge variant="neutral">Archivada</Badge>}</h1>
          <StatusBadge status={opp.stage} labels={LABELS.stage} />
        </div>
        {!archived && (
          <div className="flex flex-wrap gap-2">
            {canIssue && (
              <FormModal title="Emitir póliza" triggerLabel="Emitir póliza" kind="dialog" wide defaultOpen={sp.emitir === '1'} action={issuePolicy} submitLabel="Emitir póliza" pendingLabel="Emitiendo póliza…">
                <input type="hidden" name="opportunity_id" value={id} />
                <dl className="grid grid-cols-3 gap-2 text-[13px]">
                  <div><dt className="text-xs text-ink-soft">Cliente</dt><dd>{client?.full_name}</dd></div>
                  <div><dt className="text-xs text-ink-soft">Producto</dt><dd>{productName}</dd></div>
                  <div><dt className="text-xs text-ink-soft">Ejecutivo</dt><dd>{owner.data?.full_name ?? '—'}</dd></div>
                </dl>
                <IssuePolicyFields
                  insurers={(insurers.data ?? []).map((i) => ({ value: i.id, text: i.name }))}
                  agents={(agents.data ?? []).map((a) => ({ value: a.id, text: a.full_name }))}
                  defaultPremium={Number(opp.estimated_annual_premium)} today={today} />
              </FormModal>
            )}
            {activePolicy.data ? null : (
              <FormModal title="Cambiar etapa" triggerLabel="Cambiar etapa" triggerVariant="outline" action={changeStage} submitLabel="Guardar" pendingLabel="Guardando…">
                <input type="hidden" name="id" value={id} /><StageFields current={opp.stage} />
              </FormModal>
            )}
            {client && (
              <>
                <FormModal title="Registrar actividad" triggerLabel="Registrar actividad" triggerVariant="outline" action={addActivity} submitLabel="Guardar" pendingLabel="Guardando…">
                  <input type="hidden" name="client_id" value={client.id} /><ActivityFields opportunityId={id} />
                </FormModal>
                <FormModal title="Nuevo seguimiento" triggerLabel="Nuevo seguimiento" triggerVariant="outline" action={createFollowUp} submitLabel="Guardar" pendingLabel="Guardando…">
                  <input type="hidden" name="client_id" value={client.id} /><FollowUpFields opportunityId={id} minDate={today} />
                </FormModal>
              </>
            )}
            <FormModal title="Editar oportunidad" triggerLabel="Editar" triggerVariant="outline" kind="drawer" action={updateOpportunity} submitLabel="Guardar" pendingLabel="Guardando…">
              <input type="hidden" name="id" value={id} />
              <OpportunityFields products={(products.data ?? []).map((p) => ({ value: p.id, text: p.name }))} opportunity={opp} />
            </FormModal>
            <FormModal title="Archivar oportunidad" triggerLabel="Archivar" triggerVariant="outline" action={archiveOpportunity} submitLabel="Archivar" pendingLabel="Archivando…">
              <input type="hidden" name="id" value={id} /><p className="text-sm">La oportunidad dejará de aparecer en el tablero. Podrás verla con el filtro “Archivadas”.</p>
            </FormModal>
          </div>
        )}
      </div>

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(440px,100%),1fr))]">
        <Card><CardHeader><CardTitle>Datos</CardTitle></CardHeader><CardContent>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
            <dt className="text-ink-soft">Cliente</dt><dd>{client ? <Link className="text-primary" href={`/clientes/${client.id}`}>{client.full_name}</Link> : '—'}</dd>
            <dt className="text-ink-soft">Producto</dt><dd>{productName}</dd>
            <dt className="text-ink-soft">Prima anual estimada</dt><dd className="tabular-nums">{formatMXN(Number(opp.estimated_annual_premium))}</dd>
            <dt className="text-ink-soft">Cierre estimado</dt><dd>{opp.estimated_close_date ? formatBusinessDate(opp.estimated_close_date) : '—'}</dd>
            <dt className="text-ink-soft">Responsable</dt><dd>{owner.data?.full_name ?? '—'}</dd>
            {opp.lost_reason && (<><dt className="text-ink-soft">Motivo de pérdida</dt><dd>{opp.lost_reason}</dd></>)}
            {activePolicy.data && (<><dt className="text-ink-soft">Póliza</dt><dd><Link className="text-primary" href={`/polizas/${activePolicy.data.id}`}>{activePolicy.data.policy_number}</Link></dd></>)}
          </dl>
        </CardContent></Card>
        <Card><CardHeader><CardTitle>Línea de tiempo</CardTitle></CardHeader><CardContent>
          <ol className="space-y-2 text-[13px]">
            <li><span className="font-medium">Creación</span> · <span className="text-ink-soft">{dt(opp.created_at)}</span></li>
            {opp.closed_at && <li><span className="font-medium">Cierre ({LABELS.stage[opp.stage as keyof typeof LABELS.stage]})</span> · <span className="text-ink-soft">{dt(opp.closed_at)}</span></li>}
          </ol>
        </CardContent></Card>
      </div>
    </div>
  )
}
