import { describe, expect, it } from 'vitest'
import { generateTempPassword } from './passwords'

describe('generateTempPassword', () => {
  it('tiene al menos 16 caracteres y mezcla tipos', () => {
    const p = generateTempPassword()
    expect(p.length).toBeGreaterThanOrEqual(16)
    expect(p).toMatch(/[a-z]/)
    expect(p).toMatch(/[A-Z]/)
    expect(p).toMatch(/[0-9]/)
    expect(p).toMatch(/[^a-zA-Z0-9]/)
  })
  it('no se repite', () => expect(generateTempPassword()).not.toBe(generateTempPassword()))
})
