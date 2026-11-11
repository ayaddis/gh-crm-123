'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

type InstallEvent = Event & { prompt: () => Promise<void> }

/** Registra el service worker (solo producción) y ofrece "Instalar aplicación" cuando el navegador lo permite. */
export function RegisterSW() {
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null)

  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setInstallEvent(e as InstallEvent)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  if (!installEvent) return null
  return (
    <div className="fixed inset-x-4 bottom-24 z-20 flex items-center justify-between gap-3 rounded-md border border-line bg-white p-3">
      <span className="text-sm text-ink">Instala CRM-123 en tu pantalla de inicio.</span>
      <Button
        onClick={async () => {
          await installEvent.prompt()
          setInstallEvent(null)
        }}
      >
        Instalar aplicación
      </Button>
    </div>
  )
}
