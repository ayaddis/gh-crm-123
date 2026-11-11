import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'
import { cn } from '@/lib/utils'

// Chips de estatus: el color nunca es el único indicador, siempre lleva texto.
const badgeVariants = cva('inline-flex h-[22px] items-center rounded-md px-2 text-xs font-medium', {
  variants: {
    variant: {
      positive: 'bg-ok-bg text-ok-fg',
      attention: 'bg-warn-bg text-warn-fg',
      risk: 'bg-risk-bg text-risk-fg',
      info: 'bg-info-bg text-info-fg',
      neutral: 'bg-neutral-bg text-neutral-fg',
    },
  },
  defaultVariants: { variant: 'neutral' },
})

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}
