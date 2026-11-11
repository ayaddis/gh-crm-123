import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ReloadButton } from '@/components/reload-button'

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="px-4 py-10 text-center text-sm text-ink-soft">{children}</p>
}

export function ErrorNotice({ message = 'No pudimos cargar la información. Intenta de nuevo.' }: { message?: string }) {
  return (
    <div role="alert" className="flex items-center justify-between gap-3 rounded-md border border-risk-fg/30 bg-risk-bg px-4 py-3 text-sm text-risk-fg">
      <span>{message}</span>
      <ReloadButton />
    </div>
  )
}

export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <Card>
      <CardContent className="space-y-2.5">
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} className="h-5 w-full" />
        ))}
      </CardContent>
    </Card>
  )
}

export function PageHeader({ title, action, children }: { title: string; action?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="mb-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[22px] font-semibold">{title}</h1>
        {action}
      </div>
      {children}
    </div>
  )
}
