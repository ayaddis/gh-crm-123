import { describe, expect, it } from 'vitest'
import { formatBusinessDate, formatMXN, greetingName } from './format'

describe('format', () => {
  it('formatea MXN', () => expect(formatMXN(12345)).toBe('$12,345.00'))
  it('formatea fecha de negocio sin cambiar zona', () => expect(formatBusinessDate('2026-11-07')).toBe('07/11/2026'))
  it('toma el primer nombre', () => expect(greetingName('Ana María López')).toBe('Ana'))
})
