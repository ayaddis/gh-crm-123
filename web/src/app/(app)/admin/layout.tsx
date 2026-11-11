import { notFound } from 'next/navigation'
import { getCurrentProfile } from '@/lib/auth'

// Administración: solo Supervisor. Un Vendedor recibe 404 (la seguridad real es la RLS).
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== 'supervisor') notFound()
  return <>{children}</>
}
