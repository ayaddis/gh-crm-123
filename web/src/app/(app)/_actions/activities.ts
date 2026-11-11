'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient as createSupabase } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/session'
import { mapDbError } from '@/lib/db-errors'
import { ActionState, NO_PERMISSION, firstIssue, formToObject, requiredText, uuid } from '@/lib/form'

const schema = z.object({
  client_id: uuid,
  type: z.enum(['llamada', 'whatsapp', 'correo', 'reunion', 'nota']),
  summary: requiredText(1000, 'El resumen es obligatorio'),
  opportunity_id: z.union([uuid, z.literal('')]).optional().transform((v) => v || null),
})

/** Solo alta: las actividades nunca se editan. */
export async function addActivity(_p: ActionState, fd: FormData): Promise<ActionState> {
  const profile = await requireProfile()
  if (!profile) return { error: NO_PERMISSION }
  const parsed = schema.safeParse(formToObject(fd))
  if (!parsed.success) return { error: firstIssue(parsed.error) }
  const supabase = await createSupabase()
  const { error } = await supabase.from('activities').insert(parsed.data)
  if (error) return { error: mapDbError(error) }
  revalidatePath(`/clientes/${parsed.data.client_id}`)
  if (parsed.data.opportunity_id) revalidatePath(`/oportunidades/${parsed.data.opportunity_id}`)
  return { ok: true }
}
