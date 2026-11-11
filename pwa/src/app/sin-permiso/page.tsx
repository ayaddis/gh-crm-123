import Link from 'next/link'

export default function SinPermiso() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-[22px] font-semibold">Sin permiso</h1>
      <p className="text-base text-ink-soft">No tienes permiso para esta acción.</p>
      <Link href="/" className="text-base text-primary hover:text-primary-hover">
        Ir al Tablero
      </Link>
    </main>
  )
}
