import { TableSkeleton } from '@/components/page-state'
import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Cargando">
      <Skeleton className="h-7 w-48" />
      <TableSkeleton />
    </div>
  )
}
