import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatBusinessDate, formatMXN, REASSIGNED, todayMxIso } from '@/lib/format'
import { LABELS, label } from '@/lib/labels'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, Th, Td } from '@/components/ui/table'
import { StatusBadge } from '@/components/status-badge'
import { EmptyState, ErrorNotice } from '@/components/page-state'
import { FormModal } from '@/components/form-modal'
import { TextAreaField, TextField } from '@/components/field'
import { ClaimFields, ClaimStatusFields } from '@/components/forms/claim-fields'
import { cancelPolicy } from '../../_actions/policies'
import { markReceiptPaid } from '../../_actions/receipts'
import { createClaim, updateClaimStatus } from '../../_actions/claims'

export default async function PolizaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const supabase = await createClient()
  const { data: p, error } = await supabase.from('v_policies').select('*').eq('id', id).maybeSingle()
  if (error) return <ErrorNotice />
  if (!p) notFound()
  const [receipts, claims] = await Promise.all([
    supabase.from('v_receipts').select('id, installment_number, due_date, amount, effective_status, paid_at').eq('policy_id', id).order('installment_number'),
    supabase.from('claims').select('id, event_date, description, insurer_claim_number, status').eq('policy_id', id).order('event_date', { ascending: false }),
  ])
  const cancelled = p.status === 'cancelada'
  const today = todayMxIso()

  return (
    <div className={`space-y-4 ${cancelled ? 'opacity-80' : ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/polizas" className="text-xs text-primary">← Pólizas</Link>
          <h1 className="text-[22px] font-semibold">Póliza {p.policy_number} <StatusBadge status={p.effective_status} labels={LABELS.policy} /></h1>
          <p className="text-sm text-ink-soft">{p.client_id && p.client_name ? <Link href={`/clientes/${p.client_id}`} className="text-primary">{p.client_name}</Link> : REASSIGNED} · {p.product_name} · {p.insurer_name}</p>
        </div>
        {!cancelled && (
          <div className="flex gap-2">
            <FormModal title="Registrar siniestro" triggerLabel="Registrar siniestro" triggerVariant="outline" kind="drawer" action={createClaim} submitLabel="Guardar" pendingLabel="Guardando…">
              <ClaimFields policyId={id} today={today} />
            </FormModal>
            <FormModal title="Cancelar póliza" triggerLabel="Cancelar póliza" triggerVariant="outline" action={cancelPolicy} submitLabel="Cancelar póliza" pendingLabel="Cancelando…" cancelLabel="Volver">
              <input type="hidden" name="id" value={id} />
              <p className="rounded-md bg-warn-bg px-3 py-2 text-xs text-warn-fg">Se cancelarán los recibos pendientes. Los recibos pagados y las comisiones generadas se conservan.</p>
              <TextAreaField label="Motivo de cancelación" name="reason" maxLength={500} required />
            </FormModal>
          </div>
        )}
      </div>

      <Card><CardContent>
        <dl className="grid gap-x-6 gap-y-2 text-[13px] [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
          <div><dt className="text-xs text-ink-soft">Agente</dt><dd>{p.agent_name ?? '—'}</dd></div>
          <div><dt className="text-xs text-ink-soft">Responsable (ejecutivo)</dt><dd>{p.owner_name ?? '—'}</dd></div>
          <div><dt className="text-xs text-ink-soft">Prima anual</dt><dd className="tabular-nums">{formatMXN(Number(p.annual_premium))}</dd></div>
          <div><dt className="text-xs text-ink-soft">Forma de pago</dt><dd>{label(LABELS.frequency, p.payment_frequency)}</dd></div>
          <div><dt className="text-xs text-ink-soft">Vigencia</dt><dd>{formatBusinessDate(p.start_date!)} – {formatBusinessDate(p.end_date!)}</dd></div>
          {cancelled && <div><dt className="text-xs text-ink-soft">Motivo de cancelación</dt><dd>{p.cancellation_reason}</dd></div>}
        </dl>
      </CardContent></Card>

      <Card>
        <CardHeader><CardTitle>Calendario de recibos</CardTitle></CardHeader>
        <Table><thead><tr><Th>N.º</Th><Th>Vencimiento</Th><Th className="text-right">Monto</Th><Th>Estatus</Th><Th>Fecha de pago</Th><Th /></tr></thead><tbody>
          {(receipts.data ?? []).map((r) => (
            <tr key={r.id}>
              <Td>{r.installment_number}</Td><Td>{formatBusinessDate(r.due_date!)}</Td><Td className="text-right tabular-nums">{formatMXN(Number(r.amount))}</Td>
              <Td><StatusBadge status={r.effective_status} labels={LABELS.receipt} /></Td><Td>{r.paid_at ? formatBusinessDate(r.paid_at) : '—'}</Td>
              <Td className="text-right">
                {!cancelled && (r.effective_status === 'pendiente' || r.effective_status === 'vencido') && (
                  <FormModal title={`Marcar recibo ${r.installment_number} como pagado`} triggerLabel="Marcar pagado" triggerVariant="outline" triggerSize="sm" action={markReceiptPaid} submitLabel="Marcar pagado" pendingLabel="Guardando…">
                    <input type="hidden" name="id" value={r.id!} /><input type="hidden" name="policy_id" value={id} />
                    <TextField label="Fecha de pago" name="paid_at" type="date" defaultValue={today} max={today} required />
                  </FormModal>
                )}
              </Td>
            </tr>
          ))}</tbody></Table>
      </Card>

      <Card>
        <CardHeader><CardTitle>Siniestros</CardTitle></CardHeader>
        {(claims.data ?? []).length === 0 ? <EmptyState>No hay siniestros en esta póliza.</EmptyState> : (
          <ul>{claims.data!.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 border-b border-rowline px-4 py-2.5 text-[13px] last:border-0">
              <div><span className="font-medium">{formatBusinessDate(c.event_date)}</span> <StatusBadge status={c.status} labels={LABELS.claim} />{c.insurer_claim_number && <span className="ml-2 text-ink-soft">N.º {c.insurer_claim_number}</span>}<p className="text-ink-soft">{c.description}</p></div>
              {!cancelled && (
                <FormModal title="Cambiar estatus del siniestro" triggerLabel="Estatus" triggerVariant="outline" triggerSize="sm" action={updateClaimStatus} submitLabel="Guardar" pendingLabel="Guardando…">
                  <input type="hidden" name="id" value={c.id} /><input type="hidden" name="policy_id" value={id} /><ClaimStatusFields current={c.status} />
                </FormModal>
              )}
            </li>
          ))}</ul>
        )}
      </Card>
    </div>
  )
}
