import Link from 'next/link'
import { signOut } from '@/app/actions'
import { Button } from '@/components/ui/button'
import type { CurrentProfile } from '@/lib/auth'

export function Topbar({ profile }: { profile: CurrentProfile }) {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-end gap-4 border-b border-line bg-white px-6">
      <div className="text-right leading-tight">
        <p className="text-[13px] font-medium text-ink">{profile.full_name}</p>
        <p className="text-xs capitalize text-ink-soft">{profile.role}</p>
      </div>
      <Link
        href="/cambiar-contrasena"
        className="text-[13px] text-primary hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        Cambiar contraseña
      </Link>
      <form action={signOut}>
        <Button type="submit" variant="outline">
          Salir
        </Button>
      </form>
    </header>
  )
}
