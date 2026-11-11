/** Tipos de dato del Historial → tablas de la bitácora. "Eventos" filtra por acción. */
export const AUDIT_TYPES: Record<string, { label: string; tables: string[] }> = {
  clientes: { label: 'Clientes', tables: ['clients'] },
  oportunidades: { label: 'Oportunidades', tables: ['opportunities'] },
  polizas: { label: 'Pólizas', tables: ['policies', 'policy_commission_terms'] },
  recibos: { label: 'Recibos', tables: ['premium_receipts'] },
  siniestros: { label: 'Siniestros', tables: ['claims'] },
  comisiones: { label: 'Comisiones', tables: ['commissions', 'commission_rates'] },
  seguimientos: { label: 'Seguimientos', tables: ['follow_ups'] },
  catalogos: { label: 'Catálogos', tables: ['products', 'insurers', 'agents'] },
  usuarios: { label: 'Usuarios', tables: ['profiles'] },
  configuracion: { label: 'Configuración', tables: ['settings', 'goals'] },
  eventos: { label: 'Eventos', tables: [] },
}

export const AUDIT_ACTIONS: Record<string, string> = { insert: 'Alta', update: 'Cambio', event: 'Evento' }

const TABLE_LABEL: Record<string, string> = {
  clients: 'Cliente', opportunities: 'Oportunidad', policies: 'Póliza', policy_commission_terms: 'Porcentajes de póliza',
  premium_receipts: 'Recibo', claims: 'Siniestro', commissions: 'Comisión', commission_rates: 'Porcentajes de comisión',
  follow_ups: 'Seguimiento', products: 'Producto', insurers: 'Aseguradora', agents: 'Agente', profiles: 'Usuario',
  settings: 'Configuración', goals: 'Meta', activities: 'Actividad', app: 'Aplicación',
}

export const tableLabel = (t: string) => TABLE_LABEL[t] ?? t

const EVENT_LABEL: Record<string, string> = {
  reassign_client: 'Reasignación de cliente', summary_toggle: 'Cambio del envío automático',
  summary_trigger_requested: 'Envío manual solicitado', summary_run_started: 'Envío del resumen iniciado', summary_run_finished: 'Envío del resumen terminado',
}
export const eventLabel = (e: string | null) => (e ? (EVENT_LABEL[e] ?? e) : '')
