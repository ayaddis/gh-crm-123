import { ReloadButton } from '@/components/reload-button'

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-[17px] font-semibold">Sin conexión</h1>
      <p className="text-base text-ink-soft">Sin conexión. Revisa tu internet e intenta de nuevo.</p>
      <ReloadButton />
    </main>
  )
}
