import { Skeleton } from '@/components/ui/skeleton'

export function CardsSkeleton() {
  return (
    <div className="space-y-2.5" aria-busy="true" aria-label="Cargando">
      <div className="grid grid-cols-2 gap-2.5">
        {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
      {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-20" />)}
    </div>
  )
}
