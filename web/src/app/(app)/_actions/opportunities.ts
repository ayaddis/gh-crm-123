'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient as createSupabase } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/session'
import { mapDbError } from '@/lib/db-errors'
import { ActionState, NO_PERMISSION, firstIssue, formToObject, isoDate, money, optionalText, uuid } from '@/lib/form'

const oppSchema = z.object({
  product_id: uuid,
  estimated_annual_premium: money('La prima estimada es inválida').refine((n) => n >= 0, 'La prima no puede ser negativa'),
  estimated_close_date: z.union([isoDate, z.literal('')]).transform((v) => (v === '' ? null : v)),
})

export async function createOpportunity(_p: ActionState, fd: FormData): Promise<ActionState> {
  const profile = await requireProfile()
  if (!profile) return { error: NO_PERMISSION }
  const clientId = uuid.safeParse(fd.get('client_id'))
  const parsed = oppSchema.safeParse(formToObject(fd))
  if (!clientId.success) return { error: 'Cliente inválido.' }
  if (!parsed.success) return { error: firstIssue(parsed.error) }

  const supabase = await createSupabase()
  // El responsable es el de su cliente (la base lo exige).
  const { data: client, error: cErr } = await supabase.from('clients').select('owner_id').eq('id', clientId.data).maybeSingle()
  if (cErr || !client) return { error: cErr ? mapDbError(cErr) : NO_PERMISSION }

  const { error } = await supabase.from('opportunities').insert({ ...parsed.data, client_id: clientId.data, owner_id: client.owner_id })
  if (error) return { error: mapDbError(error) }
  revalidatePath('/oportunidades')
  revalidatePath(`/clientes/${clientId.data}`)
  return { ok: true }
}

export async function updateOpportunity(_p: ActionState, fd: FormData): Promise<ActionState> {
  const profile = await requireProfile()
  if (!profile) return { error: NO_PERMISSION }
  const id = uuid.safeParse(fd.get('id'))
  const parsed = oppSchema.safeParse(formToObject(fd))
  if (!id.success) return { error: 'Oportunidad inválida.' }
  if (!parsed.success) return { error: firstIssue(parsed.error) }
  const supabase = await createSupabase()
  const { error } = await supabase.from('opportunities').update(parsed.data).eq('id', id.data)
  if (error) return { error: mapDbError(error) }
  revalidatePath('/oportunidades')
  revalidatePath(`/oportunidades/${id.data}`)
  return { ok: true }
}

const stageSchema = z.object({
  id: uuid,
  stage: z.enum(['nuevo', 'contactado', 'cotizacion_enviada', 'negociacion', 'ganada', 'perdida']),
  lost_reason: optionalText(500),
  from: z.string().optional(),
})

export async function changeStage(_p: ActionState, fd: FormData): Promise<ActionState> {
  const profile = await requireProfile()
  if (!profile) return { error: NO_PERMISSION }
  const parsed = stageSchema.safeParse(formToObject(fd))
  if (!parsed.success) return { error: firstIssue(parsed.error) }
  const { id, stage, lost_reason } = parsed.data
  if (stage === 'perdida' && !lost_reason) return { error: 'El motivo de pérdida es obligatorio.' }

  const supabase = await createSupabase()
  const { error } = await supabase
    .from('opportunities')
    .update({ stage, lost_reason: stage === 'perdida' ? lost_reason : null })
    .eq('id', id)
  if (error) return { error: mapDbError(error) }
  revalidatePath('/oportunidades')
  revalidatePath(`/oportunidades/${id}`)
  // Al pasar a Ganada se abre de inmediato la emisión de la póliza.
  if (stage === 'ganada') return { ok: true, redirectTo: `/oportunidades/${id}?emitir=1` }
  return { ok: true }
}

export async function archiveOpportunity(_p: ActionState, fd: FormData): Promise<ActionState> {
  const profile = await requireProfile()
  if (!profile) return { error: NO_PERMISSION }
  const id = uuid.safeParse(fd.get('id'))
  if (!id.success) return { error: 'Oportunidad inválida.' }
  const supabase = await createSupabase()
  const { error } = await supabase.from('opportunities').update({ archived_at: new Date().toISOString() }).eq('id', id.data)
  if (error) return { error: mapDbError(error) }
  revalidatePath('/oportunidades')
  revalidatePath(`/oportunidades/${id.data}`)
  return { ok: true }
}
