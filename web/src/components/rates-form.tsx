'use client'
import { useActionState } from 'react'
import { Table, Th, Td } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { SubmitButton } from '@/components/submit-button'
import { saveCommissionRates } from '@/app/(app)/admin/comisiones/actions'

export type RateRow = { product_id: string; name: string; is_active: boolean; sale_agent_pct: number; sale_exec_pct: number; coll_agent_pct: number; coll_exec_pct: number }

const COLS = [
  ['sale_agent_pct', 'Venta · Agente'], ['sale_exec_pct', 'Venta · Ejecutivo'],
  ['coll_agent_pct', 'Cobranza · Agente'], ['coll_exec_pct', 'Cobranza · Ejecutivo'],
] as const

export function RatesForm({ rows }: { rows: RateRow[] }) {
  const [state, action] = useActionState(saveCommissionRates, undefined)
  return (
    <form action={action} className="space-y-3" noValidate>
      {state?.error && <p role="alert" className="rounded-md bg-risk-bg px-3 py-2 text-xs text-risk-fg">{state.error}</p>}
      {state?.ok && <p role="status" className="rounded-md bg-ok-bg px-3 py-2 text-xs text-ok-fg">Cambios guardados. Aplican a las pólizas nuevas.</p>}
      <Table>
        <thead><tr><Th>Producto</Th>{COLS.map(([, text]) => <Th key={text} className="text-right">{text} (%)</Th>)}</tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.product_id}>
              <Td className="font-medium">{r.name}{!r.is_active && <span className="ml-2 text-xs text-ink-soft">(inactivo)</span>}<input type="hidden" name="product_id" value={r.product_id} /></Td>
              {COLS.map(([f, text]) => (
                <Td key={f} className="text-right">
                  <Input name={`${r.product_id}__${f}`} type="number" min="0" max="100" step="0.01" defaultValue={r[f]} aria-label={`${text} de ${r.name}`} className="ml-auto h-8 w-24 text-right" />
                </Td>
              ))}
            </tr>
          ))}
        </tbody>
      </Table>
      <p className="text-xs text-ink-soft">Los cambios aplican a las pólizas nuevas. Las ya emitidas conservan los porcentajes con los que se emitieron.</p>
      <SubmitButton pendingText="Guardando…">Guardar cambios</SubmitButton>
    </form>
  )
}
