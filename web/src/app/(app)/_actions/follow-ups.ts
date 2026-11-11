'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient as createSupabase } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/session'
import { mapDbError } from '@/lib/db-errors'
import { ActionState, NO_PERMISSION, firstIssue, formToObject, isoDate, optionalText, uuid } from '@/lib/form'

const createSchema = z.object({
  client_id: uuid,
  due_date: isoDate,
  note: optionalText(2000),
  opportunity_id: z.union([uuid, z.literal('')]).optional().transform((v) => v || null),
})

export async function createFollowUp(_p: ActionState, fd: FormData): Promise<ActionState> {
  const profile = await requireProfile()
  if (!profile) return { error: NO_PERMISSION }
  const parsed = createSchema.safeParse(formToObject(fd))
  if (!parsed.success) return { error: firstIssue(parsed.error) }
  const supabase = await createSupabase()
  const { data: client, error: cErr } = await supabase.from('clients').select('owner_id').eq('id', parsed.data.client_id).maybeSingle()
  if (cErr || !client) return { error: cErr ? mapDbError(cErr) : NO_PERMISSION }
  const { error } = await supabase.from('follow_ups').insert({ ...parsed.data, owner_id: client.owner_id })
  if (error) return { error: mapDbError(error) }
  revalidatePath('/')
  revalidatePath(`/clientes/${parsed.data.client_id}`)
  return { ok: true }
}

const statusSchema = z.object({ id: uuid, client_id: z.string().optional() })

async function setStatus(fd: FormData, status: 'hecho' | 'cancelado'): Promise<ActionState> {
  const profile = await requireProfile()
  if (!profile) return { error: NO_PERMISSION }
  const parsed = statusSchema.safeParse(formToObject(fd))
  if (!parsed.success) return { error: firstIssue(parsed.error) }
  const supabase = await createSupabase()
  const { error } = await supabase.from('follow_ups').update({ status }).eq('id', parsed.data.id)
  if (error) return { error: mapDbError(error) }
  revalidatePath('/')
  if (parsed.data.client_id) revalidatePath(`/clientes/${parsed.data.client_id}`)
  return { ok: true }
}

export async function completeFollowUp(_p: ActionState, fd: FormData): Promise<ActionState> {
  return setStatus(fd, 'hecho')
}
export async function cancelFollowUp(_p: ActionState, fd: FormData): Promise<ActionState> {
  return setStatus(fd, 'cancelado')
}
