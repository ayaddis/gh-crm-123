'use client'
import { useFormStatus } from 'react-dom'
import { Button, type ButtonProps } from '@/components/ui/button'

/** Botón de formulario: se deshabilita y muestra el texto del proceso mientras se envía. */
export function SubmitButton({ children, pendingText, ...props }: ButtonProps & { pendingText: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} aria-busy={pending} {...props}>
      {pending ? pendingText : children}
    </Button>
  )
}
