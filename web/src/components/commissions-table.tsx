'use client'
import { useState } from 'react'
import { Table, Th, Td } from '@/components/ui/table'
import { StatusBadge } from '@/components/status-badge'
import { FormModal } from '@/components/form-modal'
import { formatMXN, formatPct, REASSIGNED } from '@/lib/format'
import { LABELS, label } from '@/lib/labels'
import { settleCommission, settleCommissions } from '@/app/(app)/_actions/commissions'

export type CommissionRow = {
  id: string; policy_number: string; client_name: string | null; beneficiary_type: string; person: string
  commission_type: string; installment_number: number; base_amount: number; rate_pct: number; amount: number; status: string
}

const warn = 'Esta acción no se puede deshacer.'

/** Tabla de comisiones. El supervisor puede liquidar por fila o varias seleccionadas. */
export function CommissionsTable({ rows, isSupervisor }: { rows: CommissionRow[]; isSupervisor: boolean }) {
  const [selected, setSelected] = useState<string[]>([])
  const pendingIds = rows.filter((r) => r.status === 'pendiente').map((r) => r.id)
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  return (
    <div className="space-y-2">
      {isSupervisor && (
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" checked={pendingIds.length > 0 && selected.length === pendingIds.length} onChange={(e) => setSelected(e.target.checked ? pendingIds : [])} aria-label="Seleccionar todas las pendientes" /> Seleccionar pendientes
          </label>
          {selected.length > 0 && (
            <FormModal title="Liquidar seleccionadas" triggerLabel={`Liquidar seleccionadas (${selected.length})`} action={settleCommissions} submitLabel="Liquidar" pendingLabel="Liquidando…">
              {selected.map((id) => <input key={id} type="hidden" name="id" value={id} />)}
              <p className="text-sm">Se liquidarán {selected.length} comisiones. {warn}</p>
            </FormModal>
          )}
        </div>
      )}
      <Table>
        <thead><tr>
          {isSupervisor && <Th />}<Th>Póliza</Th><Th>Cliente</Th>{isSupervisor && <Th>Beneficiario</Th>}<Th>Tipo</Th><Th>Recibo</Th>
          <Th className="text-right">Base</Th><Th className="text-right">%</Th><Th className="text-right">Importe</Th><Th>Estatus</Th>{isSupervisor && <Th />}
        </tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              {isSupervisor && <Td>{r.status === 'pendiente' && <input type="checkbox" checked={selected.includes(r.id)} onChange={() => toggle(r.id)} aria-label={`Seleccionar comisión de ${r.policy_number}`} />}</Td>}
              <Td>{r.policy_number}</Td><Td>{r.client_name ?? REASSIGNED}</Td>
              {isSupervisor && <Td>{label(LABELS.beneficiary, r.beneficiary_type)}: {r.person}</Td>}
              <Td>{label(LABELS.commissionType, r.commission_type)}</Td><Td>{r.installment_number}</Td>
              <Td className="text-right tabular-nums">{formatMXN(r.base_amount)}</Td><Td className="text-right tabular-nums">{formatPct(r.rate_pct)}</Td>
              <Td className="text-right tabular-nums">{formatMXN(r.amount)}</Td>
              <Td><StatusBadge status={r.status} labels={LABELS.commission} /></Td>
              {isSupervisor && <Td className="text-right">{r.status === 'pendiente' && (
                <FormModal title="Liquidar comisión" triggerLabel="Liquidar" triggerVariant="outline" triggerSize="sm" action={settleCommission} submitLabel="Liquidar" pendingLabel="Liquidando…">
                  <input type="hidden" name="id" value={r.id} /><p className="text-sm">Se liquidará {formatMXN(r.amount)}. {warn}</p>
                </FormModal>
              )}</Td>}
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  )
}
