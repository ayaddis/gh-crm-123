import Link from 'next/link'
import { getCurrentProfile } from '@/lib/auth'
import { signOut } from '@/app/actions'
import { Screen } from '@/components/layout/screen'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { publicEnv } from '@/lib/env'

export default async function CuentaPage() {
  const profile = await getCurrentProfile()
  if (!profile) return null
  return (
    <Screen title="Cuenta">
      <Card>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm text-ink-soft">Nombre</p>
            <p className="text-base font-medium">{profile.full_name}</p>
          </div>
          <div>
            <p className="text-sm text-ink-soft">Correo</p>
            <p className="break-all text-base font-medium">{profile.email}</p>
          </div>
          <div>
            <p className="text-sm text-ink-soft">Rol</p>
            <p className="text-base font-medium capitalize">{profile.role}</p>
          </div>
        </CardContent>
      </Card>
      <Button asChild variant="outline" size="lg" className="w-full">
        <Link href="/cambiar-contrasena">Cambiar contraseña</Link>
      </Button>
      <form action={signOut}>
        <Button type="submit" variant="outline" size="lg" className="w-full">
          Salir
        </Button>
      </form>
      <p className="pt-2 text-center text-xs text-ink-mute">{publicEnv.NEXT_PUBLIC_APP_NAME} · versión 0.1.0</p>
    </Screen>
  )
}
