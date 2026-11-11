import Link from 'next/link'
import { Button } from '@/components/ui/button'

export const PAGE_SIZE = 25

export function pageRange(page: number) {
  const from = (page - 1) * PAGE_SIZE
  return { from, to: from + PAGE_SIZE - 1 }
}

export function parsePage(v: string | undefined): number {
  const n = Number(v)
  return Number.isInteger(n) && n >= 1 ? n : 1
}

/** Paginación por enlaces conservando los demás filtros de la URL. */
export function Pagination({ page, total, path, params }: { page: number; total: number; path: string; params: Record<string, string | undefined> }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const href = (p: number) => {
    const q = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) if (v) q.set(k, v)
    if (p > 1) q.set('page', String(p))
    const s = q.toString()
    return s ? `${path}?${s}` : path
  }
  return (
    <div className="mt-3 flex items-center justify-between text-xs text-ink-soft">
      <span>{total} registros · Página {page} de {pages}</span>
      <div className="flex gap-2">
        {page > 1 ? <Button asChild variant="outline" size="sm"><Link href={href(page - 1)}>Anterior</Link></Button> : null}
        {page < pages ? <Button asChild variant="outline" size="sm"><Link href={href(page + 1)}>Siguiente</Link></Button> : null}
      </div>
    </div>
  )
}
