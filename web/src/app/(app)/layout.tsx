import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/auth'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')
  return (
    <div className="min-h-screen">
      <Sidebar isSupervisor={profile.role === 'supervisor'} />
      <div className="pl-[220px]">
        <Topbar profile={profile} />
        <main className="px-6 pb-8 pt-5">{children}</main>
      </div>
    </div>
  )
}
