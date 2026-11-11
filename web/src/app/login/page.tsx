import { Card, CardContent } from '@/components/ui/card'
import { LoginForm } from './login-form'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ motivo?: string }> }) {
  const { motivo } = await searchParams
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardContent className="space-y-5 p-6">
          <h1 className="text-[17px] font-bold text-navy">CRM-123</h1>
          <LoginForm inactivo={motivo === 'inactivo'} />
          <p className="text-xs text-ink-soft">
            ¿No puedes entrar? Pide a tu supervisor que restablezca tu contraseña.
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
