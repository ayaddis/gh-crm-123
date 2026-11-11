'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient as createSupabase } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/session'
import { mapDbError } from '@/lib/db-errors'
import type { TablesInsert } from '@/types/database'
import { ActionState, NO_PERMISSION, firstIssue, formToObject, isoDate, optionalText, requiredText, uuid } from '@/lib/form'

const claimSchema = z.object({
  policy_id: uuid,
  event_date: isoDate,
  description: requiredText(2000, 'La descripción es obligatoria'),
  insurer_claim_number: optionalText(60),
})

export async function createClaim(_p: ActionState, fd: FormData): Promise<ActionState> {
  const profile = await requireProfile()
  if (!profile) return { error: NO_PERMISSION }
  const parsed = claimSchema.safeParse(formToObject(fd))
  if (!parsed.success) return { error: firstIssue(parsed.error) }
  const supabase = await createSupabase()
  // client_id lo toma la base desde la póliza.
  const { error } = await supabase.from('claims').insert(parsed.data as TablesInsert<'claims'>)
  if (error) return { error: mapDbError(error) }
  revalidatePath('/siniestros')
  revalidatePath(`/polizas/${parsed.data.policy_id}`)
  return { ok: true }
}

const statusSchema = z.object({
  id: uuid,
  status: z.enum(['reportado', 'en_tramite', 'pagado', 'rechazado', 'cerrado']),
  policy_id: z.string().optional(),
})

export async function updateClaimStatus(_p: ActionState, fd: FormData): Promise<ActionState> {
  const profile = await requireProfile()
  if (!profile) return { error: NO_PERMISSION }
  const parsed = statusSchema.safeParse(formToObject(fd))
  if (!parsed.success) return { error: firstIssue(parsed.error) }
  const supabase = await createSupabase()
  const { error } = await supabase.from('claims').update({ status: parsed.data.status }).eq('id', parsed.data.id)
  if (error) return { error: mapDbError(error) }
  revalidatePath('/siniestros')
  if (parsed.data.policy_id) revalidatePath(`/polizas/${parsed.data.policy_id}`)
  return { ok: true }
}
