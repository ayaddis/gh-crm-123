import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/auth'
import { BottomNav } from '@/components/layout/bottom-nav'
import { signOut } from '@/app/actions'
import { Button } from '@/components/ui/button'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')

  // P8: la PWA es solo para supervisores (los datos igual están protegidos por RLS).
  if (profile.role !== 'supervisor') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-[17px] font-semibold">Solo para supervisores</h1>
        <p className="text-base text-ink-soft">Esta aplicación es para supervisores. Usa la versión de escritorio.</p>
        <form action={signOut}>
          <Button type="submit" size="lg">
            Salir
          </Button>
        </form>
      </main>
    )
  }

  return (
    <>
      {children}
      <BottomNav />
    </>
  )
}
