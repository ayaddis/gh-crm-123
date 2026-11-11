import { describe, expect, it } from 'vitest'
import { addMonths, buildReceiptSchedule } from './receipts'

describe('buildReceiptSchedule', () => {
  it('mensual: 12 recibos que suman la prima', () => {
    const s = buildReceiptSchedule(12000, 'mensual', '2026-11-07')
    expect(s).toHaveLength(12)
    expect(s[0]).toEqual({ number: 1, dueDate: '2026-11-07', amount: 1000 })
    expect(s[11].dueDate).toBe('2027-10-07')
    expect(s.reduce((a, r) => a + Math.round(r.amount * 100), 0)).toBe(1200000)
  })
  it('el último absorbe el redondeo', () => {
    const s = buildReceiptSchedule(1000, 'trimestral', '2026-01-01')
    expect(s.map((r) => r.amount)).toEqual([250, 250, 250, 250])
    const t = buildReceiptSchedule(100, 'mensual', '2026-01-01')
    expect(t.reduce((a, r) => a + Math.round(r.amount * 100), 0)).toBe(10000)
    expect(t[11].amount).toBeCloseTo(8.37, 2)
  })
  it('anual y semestral', () => {
    expect(buildReceiptSchedule(5000, 'anual', '2026-03-01')).toHaveLength(1)
    expect(buildReceiptSchedule(5000, 'semestral', '2026-03-01').map((r) => r.dueDate)).toEqual(['2026-03-01', '2026-09-01'])
  })
  it('ajusta fin de mes', () => expect(addMonths('2026-01-31', 1)).toBe('2026-02-28'))
})
