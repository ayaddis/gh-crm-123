'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient as createSupabase } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/session'
import { mapDbError } from '@/lib/db-errors'
import { isValidPhone, normalizePhone } from '@/lib/phone'
import { ActionState, NO_PERMISSION, firstIssue, formToObject, optionalText, requiredText, uuid } from '@/lib/form'

const clientSchema = z.object({
  full_name: requiredText(120, 'El nombre es obligatorio'),
  phone: z.string().refine(isValidPhone, 'El teléfono debe tener 10 dígitos').transform(normalizePhone),
  email: optionalText(254),
  company: optionalText(120),
  city_state: optionalText(120),
  source: z.enum(['referido', 'redes', 'llamada_en_frio', 'otro', '']).transform((v) => (v === '' ? null : v)),
  notes: optionalText(2000),
  owner_id: uuid.optional(),
})

export async function createClient(_p: ActionState, fd: FormData): Promise<ActionState> {
  const profile = await requireProfile()
  if (!profile) return { error: NO_PERMISSION }
  const parsed = clientSchema.safeParse(formToObject(fd))
  if (!parsed.success) return { error: firstIssue(parsed.error) }
  const { owner_id, email, ...rest } = parsed.data

  const supabase = await createSupabase()
  const { error } = await supabase.from('clients').insert({
    ...rest,
    email: email ? email.toLowerCase() : null,
    // El vendedor siempre es el responsable; el supervisor puede elegirlo.
    owner_id: profile.role === 'supervisor' && owner_id ? owner_id : profile.id,
  })
  if (error) return { error: mapDbError(error) }
  revalidatePath('/clientes')
  return { ok: true }
}

export async function updateClient(_p: ActionState, fd: FormData): Promise<ActionState> {
  const profile = await requireProfile()
  if (!profile) return { error: NO_PERMISSION }
  const id = uuid.safeParse(fd.get('id'))
  const parsed = clientSchema.omit({ owner_id: true }).safeParse(formToObject(fd))
  if (!id.success || !parsed.success) return { error: parsed.success ? 'Cliente inválido.' : firstIssue(parsed.error) }
  const { email, ...rest } = parsed.data

  const supabase = await createSupabase()
  const { error } = await supabase.from('clients').update({ ...rest, email: email ? email.toLowerCase() : null }).eq('id', id.data)
  if (error) return { error: mapDbError(error) }
  revalidatePath('/clientes')
  revalidatePath(`/clientes/${id.data}`)
  return { ok: true }
}

export async function archiveClient(_p: ActionState, fd: FormData): Promise<ActionState> {
  const profile = await requireProfile()
  if (!profile) return { error: NO_PERMISSION }
  const id = uuid.safeParse(fd.get('id'))
  if (!id.success) return { error: 'Cliente inválido.' }
  const supabase = await createSupabase()
  const { error } = await supabase.from('clients').update({ archived_at: new Date().toISOString() }).eq('id', id.data)
  if (error) return { error: mapDbError(error) }
  revalidatePath('/clientes')
  revalidatePath(`/clientes/${id.data}`)
  return { ok: true }
}
