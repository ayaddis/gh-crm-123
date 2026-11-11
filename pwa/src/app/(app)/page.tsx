import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatMXN } from '@/lib/format'
import { Screen } from '@/components/layout/screen'
import { Card, CardContent } from '@/components/ui/card'
import { ErrorNotice } from '@/components/page-state'

function Kpi({ label, value, detail, alert }: { label: string; value: string | number; detail?: string; alert?: boolean }) {
  return (
    <Card className={alert ? 'border-[#FCA5A5]' : undefined}>
      <CardContent className="p-3.5">
        <p className="text-sm text-ink-soft">{label}</p>
        <p className={`mt-1 text-[26px] font-bold leading-tight ${alert ? 'text-risk-fg' : ''}`}>{value}</p>
        {detail && <p className="text-sm text-ink-soft">{detail}</p>}
      </CardContent>
    </Card>
  )
}

export default async function PanelPage() {
  const supabase = await createClient()
  const [kpi, ranking] = await Promise.all([
    supabase.from('v_team_kpis').select('*').maybeSingle(),
    supabase.from('v_seller_ranking').select('*').order('won_premium_month', { ascending: false }),
  ])
  if (kpi.error || ranking.error) return <Screen title="Panel"><ErrorNotice /></Screen>

  const k = kpi.data
  const sellers = ranking.data ?? []
  if (!k || sellers.length === 0) {
    return (
      <Screen title="Panel">
        <Card><CardContent className="py-10 text-center">
          <p className="text-base font-medium">Aún no hay información del equipo.</p>
          <p className="mt-1 text-sm text-ink-soft">Los indicadores y el ranking aparecerán aquí.</p>
        </CardContent></Card>
      </Screen>
    )
  }
  const won = Number(k.won_count_month ?? 0)
  const lost = Number(k.lost_count_month ?? 0)
  const closeRate = won + lost > 0 ? Math.round((won / (won + lost)) * 100) : 0

  return (
    <Screen title="Panel">
      <div className="grid grid-cols-2 gap-2.5">
        <Kpi label="Pipeline abierto" value={Number(k.open_opportunities ?? 0)} detail={formatMXN(Number(k.open_pipeline_premium ?? 0))} />
        <Kpi label="Ganado del mes" value={formatMXN(Number(k.won_premium_month ?? 0))} detail={`Tasa de cierre ${closeRate} %`} />
        <Kpi label="Recibos vencidos" value={Number(k.overdue_receipts ?? 0)} alert={Number(k.overdue_receipts) > 0} />
        <Kpi label="Renovaciones próximas" value={Number(k.upcoming_renewals ?? 0)} />
        <Kpi label="Siniestros abiertos" value={Number(k.open_claims ?? 0)} />
        <Kpi label="Seguimientos vencidos" value={Number(k.overdue_follow_ups ?? 0)} alert={Number(k.overdue_follow_ups) > 0} />
      </div>

      <h2 className="pt-3 text-[17px] font-semibold">Ranking de vendedores del mes</h2>
      {sellers.map((s) => {
        const goal = s.goal_premium_month === null ? null : Number(s.goal_premium_month)
        const wonPrem = Number(s.won_premium_month ?? 0)
        const pct = goal && goal > 0 ? Math.min(100, Math.round((wonPrem / goal) * 100)) : 0
        return (
          <Link key={s.seller_id} href={`/vendedor/${s.seller_id}`} className="block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <Card><CardContent className="space-y-2 p-3.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-base font-semibold">{s.seller_name}</p>
                <p className="text-base tabular-nums">{formatMXN(wonPrem)}</p>
              </div>
              {goal === null ? <p className="text-sm text-ink-soft">Sin meta asignada este mes</p> : (
                <div>
                  <div className="h-2 rounded-sm bg-line" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Avance de meta de ${s.seller_name}`}>
                    <div className="h-2 rounded-sm bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-1 text-sm text-ink-soft">{pct} % de {formatMXN(goal)}</p>
                </div>
              )}
              <p className="text-sm text-ink-soft">{Number(s.open_opportunities ?? 0)} oportunidades abiertas</p>
              <div className="flex flex-wrap gap-2 text-sm">
                {Number(s.overdue_receipts) > 0 && <span className="rounded-md bg-risk-bg px-2 py-0.5 font-medium text-risk-fg">{Number(s.overdue_receipts)} recibos vencidos</span>}
                {Number(s.overdue_follow_ups) > 0 && <span className="rounded-md bg-warn-bg px-2 py-0.5 font-medium text-warn-fg">{Number(s.overdue_follow_ups)} seguimientos vencidos</span>}
              </div>
            </CardContent></Card>
          </Link>
        )
      })}
    </Screen>
  )
}
