'use client'
import { useActionState } from 'react'
import { SubmitButton } from '@/components/submit-button'
import type { ButtonProps } from '@/components/ui/button'
import type { ActionState } from '@/lib/form'

/** Acción de un clic (p. ej. "Marcar hecho"): campos ocultos + botón con estado de proceso. */
export function InlineAction({
  action, fields, label, pendingLabel, variant = 'outline', size = 'sm',
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>
  fields: Record<string, string>
  label: string
  pendingLabel: string
  variant?: ButtonProps['variant']
  size?: ButtonProps['size']
}) {
  const [state, formAction] = useActionState(action, undefined)
  return (
    <form action={formAction} className="inline-flex flex-col items-end gap-1">
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <SubmitButton variant={variant} size={size} pendingText={pendingLabel}>
        {label}
      </SubmitButton>
      {state?.error && <span role="alert" className="max-w-[220px] text-right text-xs text-risk-fg">{state.error}</span>}
    </form>
  )
}
