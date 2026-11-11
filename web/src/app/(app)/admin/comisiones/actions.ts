'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient as createSupabase } from '@/lib/supabase/server'
import { requireSupervisor } from '@/lib/session'
import { mapDbError } from '@/lib/db-errors'
import { ActionState, NO_PERMISSION, uuid } from '@/lib/form'

const pct = z.coerce.number({ message: 'Porcentaje inválido' }).min(0, 'Los porcentajes van de 0 a 100').max(100, 'Los porcentajes van de 0 a 100')
const FIELDS = ['sale_agent_pct', 'sale_exec_pct', 'coll_agent_pct', 'coll_exec_pct'] as const

/** Una fila por producto con cuatro porcentajes (0–100, 2 decimales). Aplica solo a pólizas nuevas. */
export async function saveCommissionRates(_p: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireSupervisor()
  if (!me) return { error: NO_PERMISSION }
  const productIds = z.array(uuid).min(1).safeParse(fd.getAll('product_id'))
  if (!productIds.success) return { error: 'Productos inválidos.' }

  const rows = []
  for (const productId of productIds.data) {
    const row: Record<string, number | string> = { product_id: productId }
    for (const f of FIELDS) {
      const v = pct.safeParse(fd.get(`${productId}__${f}`))
      if (!v.success) return { error: v.error.issues[0]?.message ?? 'Porcentaje inválido' }
      row[f] = Math.round(v.data * 100) / 100
    }
    rows.push(row as { product_id: string; sale_agent_pct: number; sale_exec_pct: number; coll_agent_pct: number; coll_exec_pct: number })
  }
  const supabase = await createSupabase()
  const { error } = await supabase.from('commission_rates').upsert(rows, { onConflict: 'product_id' })
  if (error) return { error: mapDbError(error) }
  revalidatePath('/admin/comisiones')
  return { ok: true }
}
