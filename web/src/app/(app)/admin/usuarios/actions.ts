'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient as createSupabase } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireSupervisor } from '@/lib/session'
import { mapDbError } from '@/lib/db-errors'
import { generateTempPassword } from '@/lib/passwords'
import { ActionState, GENERIC_ERROR, NO_PERMISSION, firstIssue, formToObject, requiredText, uuid } from '@/lib/form'
import type { Database } from '@/types/database'

const BAN_LONG = '876000h'

async function findAuthUserIdByEmail(admin: SupabaseClient<Database>, email: string): Promise<string | null> {
  for (let page = 1; page <= 5; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) return null
    const found = data.users.find((u) => u.email?.toLowerCase() === email)
    if (found) return found.id
    if (data.users.length < 200) return null
  }
  return null
}

const createSchema = z.object({
  email: z.string().trim().toLowerCase().email('Correo inválido').max(254),
  full_name: requiredText(120, 'El nombre es obligatorio'),
  role: z.enum(['vendedor', 'supervisor']),
})

/** 🔑 Crea el usuario en Auth y su perfil. La contraseña temporal se devuelve una sola vez. */
export async function createUser(_p: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireSupervisor()
  if (!me) return { error: NO_PERMISSION }
  const parsed = createSchema.safeParse(formToObject(fd))
  if (!parsed.success) return { error: firstIssue(parsed.error) }
  const { email, full_name, role } = parsed.data

  const supabase = await createSupabase()
  const limit = role === 'vendedor' ? 10 : 2
  const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', role).eq('is_active', true)
  if ((count ?? 0) >= limit) {
    return { error: `Límite alcanzado: máximo ${limit} ${role === 'vendedor' ? 'vendedores' : 'supervisores'} activos` }
  }
  const { data: existing } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle()
  if (existing) return { error: 'Ya existe un usuario con ese correo.' }

  const admin = createAdminClient()
  const password = generateTempPassword()
  let userId: string
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (created.error || !created.data.user) {
    // Puede existir un usuario de Auth huérfano (sin perfil) de un intento anterior: se reutiliza.
    const orphanId = await findAuthUserIdByEmail(admin, email)
    if (!orphanId) {
      console.error('createUser: Auth falló', created.error?.status ?? created.error?.code)
      return { error: GENERIC_ERROR }
    }
    const upd = await admin.auth.admin.updateUserById(orphanId, { password, email_confirm: true })
    if (upd.error) {
      console.error('createUser: no se pudo reutilizar el usuario huérfano', upd.error.status)
      return { error: GENERIC_ERROR }
    }
    userId = orphanId
  } else {
    userId = created.data.user.id
  }

  const profile = { id: userId, email, full_name, role, is_active: true, must_change_password: true }
  let { error } = await admin.from('profiles').insert(profile)
  if (error) ({ error } = await admin.from('profiles').insert(profile)) // un reintento
  if (error) {
    console.error('createUser: perfil falló', error.code)
    return { error: mapDbError(error) }
  }
  revalidatePath('/admin/usuarios')
  return { ok: true, secret: password }
}

/** 🔑 Nueva contraseña temporal y cambio obligatorio al siguiente ingreso. */
export async function resetUserPassword(_p: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireSupervisor()
  if (!me) return { error: NO_PERMISSION }
  const id = uuid.safeParse(fd.get('id'))
  if (!id.success) return { error: 'Usuario inválido.' }
  if (id.data === me.id) return { error: 'Para cambiar tu propia contraseña usa "Cambiar contraseña" en el menú superior.' }

  const password = generateTempPassword()
  const admin = createAdminClient()
  const { error: authError } = await admin.auth.admin.updateUserById(id.data, { password })
  if (authError) {
    console.error('resetUserPassword: Auth falló', authError.status)
    return { error: GENERIC_ERROR }
  }
  const supabase = await createSupabase()
  const { error } = await supabase.from('profiles').update({ must_change_password: true }).eq('id', id.data)
  if (error) return { error: mapDbError(error) }
  revalidatePath('/admin/usuarios')
  return { ok: true, secret: password }
}

/** 🔑 Desactivar/reactivar: perfil (con la sesión) + bloqueo en Auth para cortar sesiones. */
export async function setUserAccess(_p: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireSupervisor()
  if (!me) return { error: NO_PERMISSION }
  const parsed = z.object({ id: uuid, active: z.enum(['true', 'false']) }).safeParse(formToObject(fd))
  if (!parsed.success) return { error: firstIssue(parsed.error) }
  const active = parsed.data.active === 'true'
  if (parsed.data.id === me.id) return { error: 'No puedes desactivarte a ti mismo.' }

  const supabase = await createSupabase()
  const { error } = await supabase.from('profiles').update({ is_active: active }).eq('id', parsed.data.id)
  if (error) return { error: mapDbError(error) }

  const admin = createAdminClient()
  const { error: banError } = await admin.auth.admin.updateUserById(parsed.data.id, { ban_duration: active ? 'none' : BAN_LONG })
  if (banError) console.error('setUserAccess: bloqueo en Auth falló', banError.status)
  revalidatePath('/admin/usuarios')
  return { ok: true }
}

const profileSchema = z.object({ id: uuid, full_name: requiredText(120, 'El nombre es obligatorio'), role: z.enum(['vendedor', 'supervisor']) })

export async function updateUserProfile(_p: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireSupervisor()
  if (!me) return { error: NO_PERMISSION }
  const parsed = profileSchema.safeParse(formToObject(fd))
  if (!parsed.success) return { error: firstIssue(parsed.error) }
  const supabase = await createSupabase()
  const { error } = await supabase.from('profiles').update({ full_name: parsed.data.full_name, role: parsed.data.role }).eq('id', parsed.data.id)
  if (error) return { error: mapDbError(error) }
  revalidatePath('/admin/usuarios')
  return { ok: true }
}
