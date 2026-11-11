// Reglas puras del resumen matutino (sin acceso a la base): fáciles de probar.

export type AuditEvent = { event: string | null; created_at: string; details: Record<string, unknown> | null }

export const RUN_TTL_MS = 10 * 60 * 1000

export const EVENT = {
  requested: 'summary_trigger_requested',
  started: 'summary_run_started',
  finished: 'summary_run_finished',
  toggle: 'summary_toggle',
} as const

const ms = (iso: string) => new Date(iso).getTime()
const runIdOf = (e: AuditEvent) => (typeof e.details?.run_id === 'string' ? e.details.run_id : null)

/** Segundos que faltan para poder disparar otro envío manual (0 si ya se puede). */
export function cooldownRemainingSeconds(events: AuditEvent[], cooldownSeconds: number, now: Date): number {
  const last = events.filter((e) => e.event === EVENT.requested).map((e) => ms(e.created_at)).sort((a, b) => b - a)[0]
  if (last === undefined) return 0
  return Math.max(0, Math.ceil((last + cooldownSeconds * 1000 - now.getTime()) / 1000))
}

/** ¿Hay un envío iniciado (hace menos de 10 min) que aún no reportó su fin? */
export function hasRunInProgress(events: AuditEvent[], now: Date): boolean {
  const finished = new Set(events.filter((e) => e.event === EVENT.finished).map(runIdOf))
  return events.some(
    (e) => e.event === EVENT.started && now.getTime() - ms(e.created_at) < RUN_TTL_MS && !finished.has(runIdOf(e)),
  )
}

export type RunIdCheck = { ok: true } | { ok: false; reason: 'invalid_run' }

/** run_id válido = solicitado por un Supervisor hace menos de 10 min y todavía sin usar (un solo uso). */
export function checkRunId(runId: string | null, events: AuditEvent[], now: Date): RunIdCheck {
  if (!runId) return { ok: false, reason: 'invalid_run' }
  const requested = events.find((e) => e.event === EVENT.requested && runIdOf(e) === runId)
  if (!requested) return { ok: false, reason: 'invalid_run' }
  if (now.getTime() - ms(requested.created_at) >= RUN_TTL_MS) return { ok: false, reason: 'invalid_run' }
  if (events.some((e) => e.event === EVENT.started && runIdOf(e) === runId)) return { ok: false, reason: 'invalid_run' }
  return { ok: true }
}

export type LastRun = {
  run_id: string | null
  mode: string | null
  started_at: string
  finished_at: string | null
  sent: number | null
  failed: { user_id?: string; error?: string }[]
  status: 'running' | 'finished' | 'unconfirmed'
}

/** Estado de la última ejecución a partir de la bitácora. */
export function lastRunOf(events: AuditEvent[], now: Date): LastRun | null {
  const started = events.filter((e) => e.event === EVENT.started).sort((a, b) => ms(b.created_at) - ms(a.created_at))[0]
  if (!started) return null
  const id = runIdOf(started)
  const finished = events.find((e) => e.event === EVENT.finished && runIdOf(e) === id)
  const d = (finished?.details ?? {}) as { sent?: unknown; failed?: unknown }
  const failed = Array.isArray(d.failed) ? (d.failed as LastRun['failed']) : []
  const sent = typeof d.sent === 'number' ? d.sent : null
  const status: LastRun['status'] = finished ? 'finished' : now.getTime() - ms(started.created_at) >= RUN_TTL_MS ? 'unconfirmed' : 'running'
  return {
    run_id: id,
    mode: typeof started.details?.mode === 'string' ? started.details.mode : null,
    started_at: started.created_at,
    finished_at: finished?.created_at ?? null,
    sent,
    failed,
    status,
  }
}

/** 1 = lunes … 7 = domingo, en la zona dada. */
export function isoWeekday(now: Date, timeZone: string): number {
  const name = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone }).format(now)
  return ({ Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 } as Record<string, number>)[name] ?? 0
}
