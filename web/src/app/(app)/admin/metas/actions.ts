'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient as createSupabase } from '@/lib/supabase/server'
import { requireSupervisor } from '@/lib/session'
import { mapDbError } from '@/lib/db-errors'
import { ActionState, NO_PERMISSION, uuid } from '@/lib/form'

/** Metas del mes (`month` siempre es el día 1). Los campos vacíos no se tocan. */
export async function saveGoals(_p: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireSupervisor()
  if (!me) return { error: NO_PERMISSION }
  const month = z.string().regex(/^\d{4}-\d{2}$/).safeParse(fd.get('month'))
  if (!month.success) return { error: 'Mes inválido.' }

  const rows: { seller_id: string; month: string; target_premium: number; created_by: string }[] = []
  for (const [key, value] of fd.entries()) {
    if (!key.startsWith('target__') || typeof value !== 'string' || value.trim() === '') continue
    const sellerId = uuid.safeParse(key.slice('target__'.length))
    const amount = Number(value)
    if (!sellerId.success) return { error: 'Vendedor inválido.' }
    if (!Number.isFinite(amount) || amount < 0) return { error: 'Las metas deben ser importes de cero o más.' }
    rows.push({ seller_id: sellerId.data, month: `${month.data}-01`, target_premium: Math.round(amount * 100) / 100, created_by: me.id })
  }
  if (rows.length === 0) return { error: 'Captura al menos una meta.' }

  const supabase = await createSupabase()
  const { error } = await supabase.from('goals').upsert(rows, { onConflict: 'seller_id,month' })
  if (error) return { error: mapDbError(error) }
  revalidatePath('/admin/metas')
  revalidatePath('/')
  return { ok: true }
}
