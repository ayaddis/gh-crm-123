import { describe, expect, it } from 'vitest'
import { mapDbError } from './db-errors'

describe('mapDbError', () => {
  it('teléfono repetido', () =>
    expect(mapDbError({ code: '23505', message: 'duplicate key value violates unique constraint "clients_phone_key"' })).toBe(
      'Ya existe un cliente con ese teléfono. Consulta con tu supervisor.'))
  it('permiso', () => expect(mapDbError({ code: '42501' })).toBe('No tienes permiso para esta acción.'))
  it('regla de negocio', () => expect(mapDbError({ code: 'P0001', message: 'Mensaje en español' })).toBe('Mensaje en español'))
  it('genérico', () => expect(mapDbError({ code: 'XX000' })).toBe('Ocurrió un error. Intenta de nuevo.'))
})
