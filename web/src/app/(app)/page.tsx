import Link from 'next/link'
import { getCurrentProfile } from '@/lib/auth'
import { formatTodayMx, greetingName } from '@/lib/format'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const counters = [
  { label: 'Seguimientos de hoy', href: '/clientes' },
  { label: 'Seguimientos vencidos', href: '/clientes' },
  { label: 'Recibos vencidos o por vencer', href: '/cobranza' },
  { label: 'Renovaciones próximas', href: '/polizas' },
]

const lists = [
  { title: 'Seguimientos', empty: 'No tienes seguimientos para hoy.' },
  { title: 'Cobranza', empty: 'No hay recibos vencidos ni por vencer.' },
  { title: 'Renovaciones', empty: 'Ninguna póliza vence en los próximos 60 días.' },
]

export default async function TableroPage() {
  const profile = await getCurrentProfile()
  if (!profile) return null
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[22px] font-semibold">Hola, {greetingName(profile.full_name)}</h1>
        <p className="text-sm text-ink-soft">{formatTodayMx()}</p>
      </div>

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(150px,100%),1fr))]">
        {counters.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="rounded-md border border-line bg-white px-4 py-3.5 transition-colors duration-150 hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <p className="text-xs text-ink-soft">{c.label}</p>
            <p className="mt-1 text-[26px] font-semibold">0</p>
          </Link>
        ))}
      </div>

      <p className="text-sm text-ink-soft">Sin pendientes por hoy.</p>

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(440px,100%),1fr))]">
        {lists.map((l) => (
          <Card key={l.title}>
            <CardHeader>
              <CardTitle>{l.title}</CardTitle>
            </CardHeader>
            <CardContent className="py-8 text-center text-sm text-ink-soft">{l.empty}</CardContent>
          </Card>
        ))}
        <Card>
          <CardHeader>
            <CardTitle>Mi mes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 py-8 text-center text-sm text-ink-soft">
            <p>Sin meta asignada este mes</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
