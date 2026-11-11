export type DbErrorLike = { code?: string | null; message?: string | null; details?: string | null }

const GENERIC = 'Ocurrió un error. Intenta de nuevo.'

/** Traduce un error de la base de datos a un mensaje de negocio en español. */
export function mapDbError(error: DbErrorLike | null | undefined): string {
  if (!error) return GENERIC
  const code = error.code ?? ''
  const text = `${error.message ?? ''} ${error.details ?? ''}`

  if (code === '23505' && text.includes('clients_phone_key')) {
    return 'Ya existe un cliente con ese teléfono. Consulta con tu supervisor.'
  }
  if (code === '42501') return 'No tienes permiso para esta acción.'
  if (code === '23514') {
    if (text.includes('phone')) return 'El teléfono debe tener 10 dígitos'
    return 'Hay un dato fuera de las reglas permitidas. Revisa el formulario.'
  }
  if (code === 'P0001' && error.message) return error.message
  return GENERIC
}
