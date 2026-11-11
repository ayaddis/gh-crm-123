import 'server-only'
import { getCurrentProfile, type CurrentProfile } from '@/lib/auth'

/** Persona activa o null. Las acciones devuelven NO_PERMISSION si es null. */
export async function requireProfile(): Promise<CurrentProfile | null> {
  const p = await getCurrentProfile()
  return p && p.is_active ? p : null
}

export async function requireSupervisor(): Promise<CurrentProfile | null> {
  const p = await requireProfile()
  return p && p.role === 'supervisor' ? p : null
}
