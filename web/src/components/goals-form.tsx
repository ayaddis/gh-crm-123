'use client'
import { useActionState } from 'react'
import { Table, Th, Td } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { SubmitButton } from '@/components/submit-button'
import { formatMXN } from '@/lib/format'
import { saveGoals } from '@/app/(app)/admin/metas/actions'

export type GoalRow = { seller_id: string; name: string; target: number | null; won: number | null }

export function GoalsForm({ month, rows }: { month: string; rows: GoalRow[] }) {
  const [state, action] = useActionState(saveGoals, undefined)
  return (
    <form action={action} className="space-y-3" noValidate>
      <input type="hidden" name="month" value={month} />
      {state?.error && <p role="alert" className="rounded-md bg-risk-bg px-3 py-2 text-xs text-risk-fg">{state.error}</p>}
      {state?.ok && <p role="status" className="rounded-md bg-ok-bg px-3 py-2 text-xs text-ok-fg">Metas guardadas.</p>}
      <Table>
        <thead><tr><Th>Vendedor</Th><Th className="text-right">Meta de prima (MXN)</Th><Th className="text-right">Avance del mes</Th></tr></thead>
        <tbody>
          {rows.map((r) => {
            const pct = r.target && r.target > 0 && r.won !== null ? Math.round((r.won / r.target) * 100) : null
            return (
              <tr key={r.seller_id}>
                <Td className="font-medium">{r.name}</Td>
                <Td className="text-right"><Input name={`target__${r.seller_id}`} type="number" min="0" step="0.01" defaultValue={r.target ?? ''} aria-label={`Meta de ${r.name}`} className="ml-auto h-8 w-40 text-right" /></Td>
                <Td className="text-right tabular-nums">{r.won === null ? '—' : `${formatMXN(r.won)}${pct !== null ? ` · ${pct} %` : ''}`}</Td>
              </tr>
            )
          })}
        </tbody>
      </Table>
      <SubmitButton pendingText="Guardando…">Guardar metas</SubmitButton>
    </form>
  )
}
