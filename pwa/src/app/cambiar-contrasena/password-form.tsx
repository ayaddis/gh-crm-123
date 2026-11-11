'use client'
import { useActionState, useState } from 'react'
import { changePassword } from '@/app/actions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SubmitButton } from '@/components/submit-button'

export function PasswordForm() {
  const [state, action] = useActionState(changePassword, undefined)
  const [pwd, setPwd] = useState('')
  const okLength = pwd.length >= 10
  return (
    <form action={action} className="space-y-4" noValidate>
      {state?.error && (
        <p role="alert" className="rounded-md bg-risk-bg px-3 py-2 text-sm text-risk-fg">
          {state.error}
        </p>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="password">Contraseña nueva</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          required
        />
        <p className={okLength ? 'text-xs text-ok-fg' : 'text-sm text-ink-soft'}>
          {okLength ? '✓ ' : '• '}Mínimo 10 caracteres
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm">Repite la contraseña</Label>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
      </div>
      <SubmitButton size="lg" className="w-full" pendingText="Guardando…">
        Guardar y continuar
      </SubmitButton>
    </form>
  )
}
