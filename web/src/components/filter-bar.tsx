import { Button } from '@/components/ui/button'

/** Filtros por GET (sin JavaScript): el servidor lee los parámetros de la URL. */
export function FilterBar({ children, action }: { children: React.ReactNode; action: string }) {
  return (
    <form method="get" action={action} className="flex flex-wrap items-end gap-3">
      {children}
      <Button type="submit" variant="outline">Filtrar</Button>
    </form>
  )
}

export function FilterItem({ label, children, className = 'w-44' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1 ${className}`}>
      <span className="text-xs font-medium text-ink-soft">{label}</span>
      {children}
    </div>
  )
}
