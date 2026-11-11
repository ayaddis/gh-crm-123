import { Screen } from '@/components/layout/screen'
import { Card, CardContent } from '@/components/ui/card'

export default function PanelPage() {
  return (
    <Screen title="Panel">
      <Card>
        <CardContent className="py-10 text-center">
          <p className="text-base font-medium">Aún no hay información del equipo.</p>
          <p className="mt-1 text-sm text-ink-soft">Los indicadores y el ranking aparecerán aquí.</p>
        </CardContent>
      </Card>
    </Screen>
  )
}
