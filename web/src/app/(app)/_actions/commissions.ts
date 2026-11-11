'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient as createSupabase } from '@/lib/supabase/server'
import { requireSupervisor } from '@/lib/session'
import { mapDbError } from '@/lib/db-errors'
import { ActionState, NO_PERMISSION, firstIssue, uuid } from '@/lib/form'

/** Liquidación irreversible. Solo Supervisor (la RLS también lo exige). */
export async function settleCommissions(_p: ActionState, fd: FormData): Promise<ActionState> {
  const profile = await requireSupervisor()
  if (!profile) return { error: NO_PERMISSION }
  const parsed = z.array(uuid).min(1, 'Selecciona al menos una comisión').max(200).safeParse(fd.getAll('id'))
  if (!parsed.success) return { error: firstIssue(parsed.error) }
  const supabase = await createSupabase()
  const { error } = await supabase.from('commissions').update({ status: 'liquidada' }).in('id', parsed.data).eq('status', 'pendiente')
  if (error) return { error: mapDbError(error) }
  revalidatePath('/comisiones')
  return { ok: true }
}

export async function settleCommission(prev: ActionState, fd: FormData): Promise<ActionState> {
  return settleCommissions(prev, fd)
}
