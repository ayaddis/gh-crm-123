'use client'
import { useMemo, useState } from 'react'
import { SelectField, TextField } from '@/components/field'
import { Table, Th, Td } from '@/components/ui/table'
import { LABELS, options } from '@/lib/labels'
import { buildReceiptSchedule, type Frequency } from '@/lib/receipts'
import { formatBusinessDate, formatMXN } from '@/lib/format'

type Opt = { value: string; text: string }

/** Campos de emisión con vista previa del calendario de recibos (misma regla que la base de datos). */
export function IssuePolicyFields({
  insurers, agents, defaultPremium, today,
}: { insurers: Opt[]; agents: Opt[]; defaultPremium: number; today: string }) {
  const [premium, setPremium] = useState(String(defaultPremium || ''))
  const [frequency, setFrequency] = useState<Frequency>('anual')
  const [start, setStart] = useState(today)

  const schedule = useMemo(() => {
    const n = Number(premium)
    if (!(n > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(start)) return []
    return buildReceiptSchedule(n, frequency, start)
  }, [premium, frequency, start])

  return (
    <>
      <SelectField label="Aseguradora" name="insurer_id" options={insurers} placeholder="Selecciona…" required />
      <SelectField label="Agente (opcional)" name="agent_id" options={agents} placeholder="Sin agente" />
      <TextField label="Número de póliza" name="policy_number" maxLength={60} required />
      <TextField label="Prima anual (MXN)" name="annual_premium" type="number" step="0.01" min="0.01" value={premium} onChange={(e) => setPremium(e.target.value)} required />
      <SelectField label="Forma de pago" name="payment_frequency" value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)} options={options(LABELS.frequency)} />
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Inicio de vigencia" name="start_date" type="date" value={start} onChange={(e) => setStart(e.target.value)} required />
        <TextField label="Fin de vigencia" name="end_date" type="date" required />
      </div>
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-ink-soft">Vista previa de recibos</p>
        {schedule.length === 0 ? <p className="text-xs text-ink-soft">Captura prima y fecha de inicio para ver el calendario.</p> : (
          <Table><thead><tr><Th>N.º</Th><Th>Vencimiento</Th><Th className="text-right">Monto</Th></tr></thead>
            <tbody>{schedule.map((r) => <tr key={r.number}><Td>{r.number}</Td><Td>{formatBusinessDate(r.dueDate)}</Td><Td className="text-right tabular-nums">{formatMXN(r.amount)}</Td></tr>)}</tbody></Table>
        )}
      </div>
      <p className="rounded-md bg-warn-bg px-3 py-2 text-xs text-warn-fg">
        Los datos de emisión no se pueden modificar después; si hay un error, se cancela la póliza y se emite de nuevo.
      </p>
    </>
  )
}
