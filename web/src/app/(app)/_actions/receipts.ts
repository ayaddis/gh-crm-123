'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient as createSupabase } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/session'
import { mapDbError } from '@/lib/db-errors'
import { todayMxIso } from '@/lib/format'
import { ActionState, NO_PERMISSION, firstIssue, formToObject, isoDate, uuid } from '@/lib/form'

const paySchema = z.object({ id: uuid, paid_at: z.union([isoDate, z.literal('')]).optional(), policy_id: z.string().optional() })

export async function markReceiptPaid(_p: ActionState, fd: FormData): Promise<ActionState> {
  const profile = await requireProfile()
  if (!profile) return { error: NO_PERMISSION }
  const parsed = paySchema.safeParse(formToObject(fd))
  if (!parsed.success) return { error: firstIssue(parsed.error) }
  const paidAt = parsed.data.paid_at || todayMxIso()
  if (paidAt > todayMxIso()) return { error: 'La fecha de pago no puede ser futura.' }

  const supabase = await createSupabase()
  const { error } = await supabase.from('premium_receipts').update({ status: 'pagado', paid_at: paidAt }).eq('id', parsed.data.id)
  if (error) return { error: mapDbError(error) }
  revalidatePath('/')
  revalidatePath('/cobranza')
  revalidatePath('/polizas')
  revalidatePath('/comisiones')
  if (parsed.data.policy_id) revalidatePath(`/polizas/${parsed.data.policy_id}`)
  return { ok: true }
}
