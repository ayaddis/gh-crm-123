'use client'
import { Button } from '@/components/ui/button'

export function ReloadButton() {
  return (
    <Button size="lg" onClick={() => window.location.reload()}>
      Reintentar
    </Button>
  )
}
