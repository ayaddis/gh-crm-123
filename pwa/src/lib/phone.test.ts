import { describe, expect, it } from 'vitest'
import { formatPhone, isValidPhone, normalizePhone } from './phone'

describe('normalizePhone', () => {
  it('quita separadores', () => expect(normalizePhone('55 1234 5678')).toBe('5512345678'))
  it('quita el prefijo 52 si sobran dígitos', () => expect(normalizePhone('+52 55 1234 5678')).toBe('5512345678'))
  it('no quita 52 si son 10 dígitos', () => expect(normalizePhone('5212345678')).toBe('5212345678'))
  it('valida longitud', () => {
    expect(isValidPhone('55-1234-5678')).toBe(true)
    expect(isValidPhone('1234')).toBe(false)
  })
  it('da formato', () => expect(formatPhone('5512345678')).toBe('55 1234 5678'))
})
