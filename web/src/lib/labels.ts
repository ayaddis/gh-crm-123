import type { BadgeVariant } from '@/components/ui/badge'

export const LABELS = {
  role: { vendedor: 'Vendedor', supervisor: 'Supervisor' },
  source: { referido: 'Referido', redes: 'Redes', llamada_en_frio: 'Llamada en frío', otro: 'Otro' },
  stage: {
    nuevo: 'Nuevo', contactado: 'Contactado', cotizacion_enviada: 'Cotización enviada',
    negociacion: 'Negociación', ganada: 'Ganada', perdida: 'Perdida',
  },
  frequency: { anual: 'Anual', semestral: 'Semestral', trimestral: 'Trimestral', mensual: 'Mensual' },
  policy: { emitida: 'Emitida', vigente: 'Vigente', cancelada: 'Cancelada', vencida: 'Vencida' },
  receipt: { pendiente: 'Pendiente', pagado: 'Pagado', vencido: 'Vencido', cancelado: 'Cancelado' },
  claim: { reportado: 'Reportado', en_tramite: 'En trámite', pagado: 'Pagado', rechazado: 'Rechazado', cerrado: 'Cerrado' },
  beneficiary: { ejecutivo: 'Ejecutivo', agente: 'Agente' },
  commissionType: { venta: 'Venta', cobranza: 'Cobranza' },
  commission: { pendiente: 'Pendiente', liquidada: 'Liquidada' },
  activity: { llamada: 'Llamada', whatsapp: 'WhatsApp', correo: 'Correo', reunion: 'Reunión', nota: 'Nota' },
  followUp: { pendiente: 'Pendiente', hecho: 'Hecho', cancelado: 'Cancelado' },
} as const

export const OPEN_STAGES = ['nuevo', 'contactado', 'cotizacion_enviada', 'negociacion'] as const
export const BOARD_STAGES = [...OPEN_STAGES, 'ganada', 'perdida'] as const

export function label(map: Record<string, string>, key: string | null | undefined): string {
  return key ? (map[key] ?? key) : '—'
}

/** Color por estatus (siempre acompañado de texto). */
const TONE: Record<string, BadgeVariant> = {
  pagado: 'positive', vigente: 'positive', ganada: 'positive', liquidada: 'positive', hecho: 'positive',
  pendiente: 'attention', emitida: 'attention', en_tramite: 'attention', negociacion: 'attention',
  vencido: 'risk', vencida: 'risk', perdida: 'risk', rechazado: 'risk',
  nuevo: 'info', contactado: 'info', cotizacion_enviada: 'info', reportado: 'info',
  cancelada: 'neutral', cancelado: 'neutral', cerrado: 'neutral',
}
export function toneOf(status: string): BadgeVariant {
  return TONE[status] ?? 'neutral'
}

export const options = (map: Record<string, string>) => Object.entries(map).map(([value, text]) => ({ value, text }))
