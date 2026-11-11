import { createClient } from '@/lib/supabase/server'
import { ErrorNotice, PageHeader } from '@/components/page-state'
import { RatesForm, type RateRow } from '@/components/rates-form'

export default async function PorcentajesPage() {
  const supabase = await createClient()
  const [products, rates] = await Promise.all([
    supabase.from('products').select('id, name, is_active').order('name'),
    supabase.from('commission_rates').select('*'),
  ])
  if (products.error || rates.error) return <ErrorNotice />
  const byProduct = new Map((rates.data ?? []).map((r) => [r.product_id, r]))
  const rows: RateRow[] = (products.data ?? []).map((p) => {
    const r = byProduct.get(p.id)
    return { product_id: p.id, name: p.name, is_active: p.is_active, sale_agent_pct: Number(r?.sale_agent_pct ?? 0), sale_exec_pct: Number(r?.sale_exec_pct ?? 0), coll_agent_pct: Number(r?.coll_agent_pct ?? 0), coll_exec_pct: Number(r?.coll_exec_pct ?? 0) }
  })
  return (<><PageHeader title="Porcentajes de comisión" /><RatesForm rows={rows} /></>)
}
