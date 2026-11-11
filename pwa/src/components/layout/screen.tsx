/** Encabezado azul profundo (52 px) + contenido en una columna, con espacio para la barra inferior. */
export function Screen({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-10 flex h-[52px] items-center bg-navy px-4 pt-[env(safe-area-inset-top)] text-[17px] font-semibold text-white">
        {title}
      </header>
      <main className="mx-auto max-w-xl space-y-2.5 px-4 pb-[calc(60px+20px+env(safe-area-inset-bottom))] pt-4">
        {children}
      </main>
    </>
  )
}
