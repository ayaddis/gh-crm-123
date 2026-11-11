import * as React from 'react'
import { cn } from '@/lib/utils'

export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto rounded-md border border-line bg-white">
      <table className={cn('w-full border-collapse text-[13px]', className)} {...props} />
    </div>
  )
}
export function Th({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="col"
      className={cn('sticky top-0 whitespace-nowrap border-b border-line bg-white px-3 py-2.5 text-left text-xs font-semibold text-ink-soft', className)}
      {...props}
    />
  )
}
export function Td({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('h-10 border-b border-rowline px-3 py-1.5 align-middle text-ink', className)} {...props} />
}
export const num = 'text-right tabular-nums'
