import { createClient } from '@/lib/supabase/server'
import { todayMxIso } from '@/lib/format'
import { Input } from '@/components/ui/input'
import { EmptyState, ErrorNotice, PageHeader } from '@/components/page-state'
import { FilterBar, FilterItem } from '@/components/filter-bar'
import { GoalsForm, type GoalRow } from '@/components/goals-form'

export default async function MetasPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const sp = await searchParams
  const current = todayMxIso().slice(0, 7)
  const month = sp.mes && /^\d{4}-\d{2}$/.test(sp.mes) ? sp.mes : current
  const supabase = await createClient()

  const [sellers, goals, ranking] = await Promise.all([
    supabase.from('profiles').select('id, full_name').eq('role', 'vendedor').eq('is_active', true).order('full_name'),
    supabase.from('goals').select('seller_id, target_premium').eq('month', `${month}-01`),
    supabase.from('v_seller_ranking').select('seller_id, won_premium_month'),
  ])
  if (sellers.error || goals.error || ranking.error) return <ErrorNotice />

  const target = new Map((goals.data ?? []).map((g) => [g.seller_id, Number(g.target_premium)]))
  const won = new Map((ranking.data ?? []).map((r) => [r.seller_id, Number(r.won_premium_month ?? 0)]))
  const rows: GoalRow[] = (sellers.data ?? []).map((s) => ({
    seller_id: s.id, name: s.full_name, target: target.get(s.id) ?? null,
    // El avance solo existe para el mes en curso (así lo calcula la vista del ranking).
    won: month === current ? (won.get(s.id) ?? 0) : null,
  }))

  return (
    <>
      <PageHeader title="Metas">
        <FilterBar action="/admin/metas"><FilterItem label="Mes"><Input type="month" name="mes" defaultValue={month} /></FilterItem></FilterBar>
      </PageHeader>
      {rows.length === 0 ? <div className="rounded-md border border-line bg-white"><EmptyState>Aún no hay vendedores activos.</EmptyState></div> : <GoalsForm key={month} month={month} rows={rows} />}
    </>
  )
}
