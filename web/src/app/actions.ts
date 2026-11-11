'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { mapDbError } from '@/lib/db-errors'

export type FormState = { error?: string } | undefined

const signInSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(200),
})

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  const generic = { error: 'Correo o contraseña incorrectos' }
  if (!parsed.success) return generic

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) return generic
  redirect('/')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

const passwordSchema = z
  .object({
    password: z.string().min(10, 'La contraseña debe tener al menos 10 caracteres').max(72),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: 'Las contraseñas no coinciden', path: ['confirm'] })

export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = passwordSchema.safeParse({
    password: formData.get('password'),
    confirm: formData.get('confirm'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Revisa los datos' }

  const supabase = await createClient()
  const { error: authError } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (authError) {
    console.error('changePassword: updateUser falló', authError.code ?? authError.status)
    return { error: 'No se pudo guardar la contraseña. Elige una distinta e intenta de nuevo.' }
  }
  const { error } = await supabase.rpc('mark_password_changed')
  if (error) {
    console.error('changePassword: mark_password_changed falló', error.code)
    return { error: mapDbError(error) }
  }
  redirect('/')
}
