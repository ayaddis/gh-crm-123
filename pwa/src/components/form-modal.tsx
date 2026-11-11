'use client'
import { useActionState, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, type ButtonProps } from '@/components/ui/button'
import { SubmitButton } from '@/components/submit-button'
import type { ActionState } from '@/lib/form'
import { cn } from '@/lib/utils'

type Props = {
  title: string
  triggerLabel: string
  triggerVariant?: ButtonProps['variant']
  triggerSize?: ButtonProps['size']
  /** 'drawer' = panel lateral derecho de 440 px; 'dialog' = diálogo centrado. */
  kind?: 'drawer' | 'dialog'
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>
  submitLabel: string
  pendingLabel: string
  cancelLabel?: string
  defaultOpen?: boolean
  wide?: boolean
  children: React.ReactNode
}

function SecretResult({ secret, onClose }: { secret: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 space-y-3 px-5 py-4">
        <p className="text-sm">Contraseña temporal:</p>
        <p className="break-all rounded-md border border-line bg-page px-3 py-2 font-mono text-sm" data-testid="temp-password">{secret}</p>
        <p role="alert" className="rounded-md bg-warn-bg px-3 py-2 text-xs text-warn-fg">
          No se volverá a mostrar. Cópiala ahora y compártela de forma segura; se le pedirá cambiarla al entrar.
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(secret)
              setCopied(true)
            } catch {
              setCopied(false)
            }
          }}
        >
          {copied ? 'Copiada' : 'Copiar'}
        </Button>
      </div>
      <div className="flex justify-end border-t border-line px-5 py-3">
        <Button type="button" onClick={onClose}>Cerrar</Button>
      </div>
    </div>
  )
}

function Inner({ action, submitLabel, pendingLabel, cancelLabel = 'Cancelar', onClose, onDone, children }: Pick<Props, 'action' | 'submitLabel' | 'pendingLabel' | 'cancelLabel' | 'children'> & { onClose: () => void; onDone: () => void }) {
  const [state, formAction] = useActionState(action, undefined)
  const router = useRouter()
  useEffect(() => {
    if (state?.ok && !state.secret) {
      onDone()
      if (state.redirectTo) router.push(state.redirectTo)
    }
  }, [state, onDone, router])
  if (state?.ok && state.secret) return <SecretResult secret={state.secret} onClose={onClose} />
  return (
    <form action={formAction} className="flex min-h-0 flex-1 flex-col" noValidate>
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {state?.error && (
          <p role="alert" className="rounded-md bg-risk-bg px-3 py-2 text-xs text-risk-fg">
            {state.error}
          </p>
        )}
        {children}
      </div>
      <div className="flex justify-end gap-2 border-t border-line px-5 py-3">
        <Button type="button" variant="outline" onClick={onClose}>
          {cancelLabel}
        </Button>
        <SubmitButton pendingText={pendingLabel}>{submitLabel}</SubmitButton>
      </div>
    </form>
  )
}

/** Botón que abre un diálogo o panel lateral con un formulario ligado a una Server Action. */
export function FormModal({
  title, triggerLabel, triggerVariant = 'default', triggerSize, kind = 'dialog', defaultOpen = false, wide, children, ...rest
}: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (defaultOpen) ref.current?.showModal()
  }, [defaultOpen])

  const close = () => ref.current?.close()
  const isDrawer = kind === 'drawer'
  return (
    <>
      <Button type="button" variant={triggerVariant} size={triggerSize} onClick={() => ref.current?.showModal()}>
        {triggerLabel}
      </Button>
      <dialog
        ref={ref}
        aria-label={title}
        onClose={() => setVersion((v) => v + 1)}
        onClick={(e) => {
          if (e.target === ref.current) close()
        }}
        className={cn(
          'm-0 max-h-none bg-transparent p-0 backdrop:bg-[rgba(15,23,42,0.40)] open:flex',
          isDrawer
            ? 'ml-auto h-screen w-[440px] max-w-full backdrop:bg-[rgba(15,23,42,0.28)]'
            : cn('m-auto w-full', wide ? 'max-w-2xl' : 'max-w-md'),
        )}
      >
        <div
          className={cn(
            'flex w-full flex-col bg-white',
            isDrawer ? 'h-screen' : 'max-h-[90vh] rounded-md shadow-[0_20px_48px_rgba(15,23,42,0.18)]',
          )}
        >
          <div className="border-b border-line px-5 py-4">
            <h2 className={isDrawer ? 'text-[17px] font-semibold' : 'text-[20px] font-semibold'}>{title}</h2>
          </div>
          <Inner key={version} {...rest} onClose={close} onDone={close}>
            {children}
          </Inner>
        </div>
      </dialog>
    </>
  )
}
