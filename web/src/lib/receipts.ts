export type Frequency = 'anual' | 'semestral' | 'trimestral' | 'mensual'

export type ReceiptPreview = { number: number; dueDate: string; amount: number }

const STEP: Record<Frequency, number> = { anual: 12, semestral: 6, trimestral: 3, mensual: 1 }

/** Suma meses a 'YYYY-MM-DD' ajustando al último día del mes, igual que Postgres. */
export function addMonths(date: string, months: number): string {
  const [y, m, d] = date.split('-').map(Number)
  const total = (m - 1) + months
  const year = y + Math.floor(total / 12)
  const month = ((total % 12) + 12) % 12
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const day = Math.min(d, lastDay)
  return `${String(year).padStart(4, '0')}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/**
 * Vista previa del calendario de recibos. Replica trg_policies_after_insert:
 * el primero vence en start_date y el último absorbe el redondeo.
 */
export function buildReceiptSchedule(annualPremium: number, frequency: Frequency, startDate: string): ReceiptPreview[] {
  const step = STEP[frequency]
  const n = 12 / step
  const cents = Math.round(annualPremium * 100)
  const baseCents = Math.round(cents / n)
  return Array.from({ length: n }, (_, i) => ({
    number: i + 1,
    dueDate: addMonths(startDate, i * step),
    amount: (i === n - 1 ? cents - baseCents * (n - 1) : baseCents) / 100,
  }))
}
