import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

export type Role = 'vendedor' | 'supervisor'

export type CurrentProfile = {
  id: string
  email: string
  full_name: string
  role: Role
  is_active: boolean
  must_change_password: boolean
}

/**
 * Persona actual. Se identifica con getUser() (valida el token con Supabase) y el rol
 * se lee SOLO de la tabla profiles, nunca del JWT ni del cliente.
 */
export const getCurrentProfile = cache(async (): Promise<CurrentProfile | null> => {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, is_active, must_change_password')
    .eq('id', user.id)
    .maybeSingle()
  if (!data) return null

  return { ...data, role: data.role === 'supervisor' ? 'supervisor' : 'vendedor' }
})
