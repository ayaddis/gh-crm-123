const TZ = 'America/Mexico_City'

const mxn = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })

export function formatMXN(value: number): string {
  return mxn.format(value)
}

/** Fecha de negocio 'YYYY-MM-DD' → dd/mm/aaaa, sin convertir zona horaria. */
export function formatBusinessDate(value: string): string {
  const [y, m, d] = value.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

/** Hoy en Ciudad de México, p. ej. "sábado 07/11/2026". */
export function formatTodayMx(now: Date = new Date()): string {
  const weekday = new Intl.DateTimeFormat('es-MX', { weekday: 'long', timeZone: TZ }).format(now)
  const date = new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: TZ,
  }).format(now)
  return `${weekday} ${date}`
}

export function greetingName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName
}

/** Hoy en Ciudad de México como 'YYYY-MM-DD'. */
export function todayMxIso(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

export function formatPct(value: number): string {
  return `${value.toFixed(2)} %`
}

/** Suma días a 'YYYY-MM-DD' (sin zona horaria). */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + days))
  return dt.toISOString().slice(0, 10)
}

export const REASSIGNED = 'Cliente reasignado'
