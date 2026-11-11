import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-[22px] font-semibold">Página no encontrada</h1>
      <p className="text-base text-ink-soft">La página que buscas no existe.</p>
      <Link href="/" className="text-base text-primary hover:text-primary-hover">
        Ir al Tablero
      </Link>
    </main>
  )
}
