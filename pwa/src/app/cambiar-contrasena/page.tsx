import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/auth'
import { signOut } from '@/app/actions'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PasswordForm } from './password-form'

export default async function ChangePasswordPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardContent className="space-y-5 p-6">
          <h1 className="text-[22px] font-bold text-navy">CRM-123</h1>
          <p className="text-base text-ink-soft">Por seguridad, crea tu propia contraseña.</p>
          <PasswordForm />
          <form action={signOut}>
            <Button type="submit" variant="ghost" className="w-full">
              Salir
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
