'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient as createSupabase } from '@/lib/supabase/server'
import { requireSupervisor } from '@/lib/session'
import { mapDbError } from '@/lib/db-errors'
import { isValidPhone, normalizePhone } from '@/lib/phone'
import { ActionState, NO_PERMISSION, firstIssue, formToObject, requiredText, uuid } from '@/lib/form'

const idField = z.union([uuid, z.literal('')]).optional().transform((v) => v || null)
const activeField = z.enum(['true', 'false']).optional().transform((v) => (v === undefined ? undefined : v === 'true'))

const nameSchema = z.object({ id: idField, name: requiredText(120, 'El nombre es obligatorio'), is_active: activeField })

async function saveNamed(table: 'products' | 'insurers', fd: FormData): Promise<ActionState> {
  if (!(await requireSupervisor())) return { error: NO_PERMISSION }
  const parsed = nameSchema.safeParse(formToObject(fd))
  if (!parsed.success) return { error: firstIssue(parsed.error) }
  const { id, name, is_active } = parsed.data
  const supabase = await createSupabase()
  const { error } = id
    ? await supabase.from(table).update({ name, ...(is_active === undefined ? {} : { is_active }) }).eq('id', id)
    : await supabase.from(table).insert({ name })
  if (error) return { error: mapDbError(error) }
  revalidatePath('/admin/catalogos')
  return { ok: true }
}

export async function saveProduct(_p: ActionState, fd: FormData) {
  return saveNamed('products', fd)
}
export async function saveInsurer(_p: ActionState, fd: FormData) {
  return saveNamed('insurers', fd)
}

const agentSchema = z.object({
  id: idField,
  full_name: requiredText(120, 'El nombre es obligatorio'),
  phone: z.string().refine(isValidPhone, 'El teléfono debe tener 10 dígitos').transform(normalizePhone),
  is_active: activeField,
})

export async function saveAgent(_p: ActionState, fd: FormData): Promise<ActionState> {
  if (!(await requireSupervisor())) return { error: NO_PERMISSION }
  const parsed = agentSchema.safeParse(formToObject(fd))
  if (!parsed.success) return { error: firstIssue(parsed.error) }
  const { id, full_name, phone, is_active } = parsed.data
  const supabase = await createSupabase()
  const { error } = id
    ? await supabase.from('agents').update({ full_name, phone, ...(is_active === undefined ? {} : { is_active }) }).eq('id', id)
    : await supabase.from('agents').insert({ full_name, phone })
  if (error) return { error: mapDbError(error) }
  revalidatePath('/admin/catalogos')
  return { ok: true }
}
