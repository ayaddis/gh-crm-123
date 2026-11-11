'use client'
import { useActionState } from 'react'
import { signIn } from '@/app/actions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SubmitButton } from '@/components/submit-button'

export function LoginForm({ inactivo }: { inactivo: boolean }) {
  const [state, action] = useActionState(signIn, undefined)
  return (
    <form action={action} className="space-y-4" noValidate>
      {inactivo && (
        <p role="alert" className="rounded-md bg-warn-bg px-3 py-2 text-xs text-warn-fg">
          Tu cuenta no está activa. Consulta con tu supervisor.
        </p>
      )}
      {state?.error && (
        <p role="alert" className="rounded-md bg-risk-bg px-3 py-2 text-xs text-risk-fg">
          {state.error}
        </p>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="email">Correo</Label>
        <Input id="email" name="email" type="email" autoComplete="username" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Contraseña</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <SubmitButton size="lg" className="w-full" pendingText="Entrando…">
        Entrar
      </SubmitButton>
    </form>
  )
}
