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
  if (code === '23505') {
    if (text.includes('products_name_key') || text.includes('insurers_name_key')) return 'Ya existe un registro con ese nombre.'
    if (text.includes('agents_phone_key')) return 'Ya existe un agente con ese teléfono.'
    if (text.includes('profiles_email_key')) return 'Ya existe un usuario con ese correo.'
    if (text.includes('policies_')) return 'Ya existe una póliza con ese número para esa aseguradora, o la oportunidad ya tiene una póliza.'
    return 'Ya existe un registro con esos datos.'
  }
  if (code === '42501') return 'No tienes permiso para esta acción.'
  if (code === '23514') {
    if (text.includes('phone')) return 'El teléfono debe tener 10 dígitos'
    return 'Hay un dato fuera de las reglas permitidas. Revisa el formulario.'
  }
  if (code === 'P0001' && error.message) return error.message
  return GENERIC
}
