import { describe, expect, it } from 'vitest'
import { checkRunId, cooldownRemainingSeconds, hasRunInProgress, isoWeekday, lastRunOf, type AuditEvent } from './summary'

const now = new Date('2026-11-09T14:00:00Z')
const ago = (s: number) => new Date(now.getTime() - s * 1000).toISOString()
const ev = (event: string, s: number, details: Record<string, unknown> = {}): AuditEvent => ({ event, created_at: ago(s), details })

describe('checkRunId', () => {
  it('acepta un run_id reciente y sin usar', () => expect(checkRunId('a', [ev('summary_trigger_requested', 30, { run_id: 'a' })], now)).toEqual({ ok: true }))
  it('rechaza uno inexistente o nulo', () => {
    expect(checkRunId('a', [], now).ok).toBe(false)
    expect(checkRunId(null, [ev('summary_trigger_requested', 30, { run_id: 'a' })], now).ok).toBe(false)
  })
  it('rechaza uno vencido (≥ 10 min)', () => expect(checkRunId('a', [ev('summary_trigger_requested', 601, { run_id: 'a' })], now).ok).toBe(false))
  it('es de un solo uso', () =>
    expect(checkRunId('a', [ev('summary_trigger_requested', 60, { run_id: 'a' }), ev('summary_run_started', 50, { run_id: 'a' })], now)).toEqual({ ok: false, reason: 'invalid_run' }))
})

describe('cooldown y ejecución en curso', () => {
  it('calcula el enfriamiento', () => {
    expect(cooldownRemainingSeconds([ev('summary_trigger_requested', 30, { run_id: 'a' })], 120, now)).toBe(90)
    expect(cooldownRemainingSeconds([ev('summary_trigger_requested', 300, { run_id: 'a' })], 120, now)).toBe(0)
    expect(cooldownRemainingSeconds([], 120, now)).toBe(0)
  })
  it('detecta envío en proceso', () => {
    expect(hasRunInProgress([ev('summary_run_started', 60, { run_id: 'a' })], now)).toBe(true)
    expect(hasRunInProgress([ev('summary_run_started', 60, { run_id: 'a' }), ev('summary_run_finished', 30, { run_id: 'a' })], now)).toBe(false)
    expect(hasRunInProgress([ev('summary_run_started', 700, { run_id: 'a' })], now)).toBe(false)
  })
})

describe('lastRunOf', () => {
  it('terminada', () => {
    const r = lastRunOf([ev('summary_run_started', 60, { run_id: 'a', mode: 'manual' }), ev('summary_run_finished', 30, { run_id: 'a', sent: 3, failed: [] })], now)
    expect(r).toMatchObject({ status: 'finished', sent: 3, mode: 'manual' })
  })
  it('sin confirmación a los 10 min', () => expect(lastRunOf([ev('summary_run_started', 700, { run_id: 'a' })], now)?.status).toBe('unconfirmed'))
  it('sin ejecuciones', () => expect(lastRunOf([], now)).toBeNull())
})

describe('isoWeekday', () => {
  it('lunes en Ciudad de México', () => expect(isoWeekday(now, 'America/Mexico_City')).toBe(1))
})
