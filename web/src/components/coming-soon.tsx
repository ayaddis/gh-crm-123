import { Card, CardContent } from '@/components/ui/card'

export function ComingSoon({ title }: { title: string }) {
  return (
    <>
      <h1 className="text-[22px] font-semibold">{title}</h1>
      <Card className="mt-4">
        <CardContent className="py-10 text-center text-sm text-ink-soft">
          Disponible en un hito posterior
        </CardContent>
      </Card>
    </>
  )
}
