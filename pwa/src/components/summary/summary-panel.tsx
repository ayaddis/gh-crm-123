'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorNotice } from '@/components/page-state'

type LastRun = {
  run_id: string | null; mode: string | null; started_at: string; finished_at: string | null
  sent: number | null; failed: { name: string; error: string }[]; status: 'running' | 'finished' | 'unconfirmed'
}
type Status = { enabled: boolean; test_mode: boolean; cooldown_remaining_s: number; last_run: LastRun | null }

const POLL_MS = 3000
const POLL_MAX_MS = 2 * 60 * 1000

const fmt = (iso: string) => new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Mexico_City' }).format(new Date(iso))

export function SummaryPanel() {
  const [status, setStatus] = useState<Status | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [busy, setBusy] = useState<'toggle' | 'send' | null>(null)
  const [confirm, setConfirm] = useState<'toggle' | 'send' | null>(null)
  const [waiting, setWaiting] = useState<string | null>(null) // run_id que se espera
  const [message, setMessage] = useState<{ kind: 'error' | 'info'; text: string } | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const pollStart = useRef(0)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/summary/status', { cache: 'no-store' })
      if (!res.ok) throw new Error()
      const data = (await res.json()) as Status
      setStatus(data)
      setCooldown(data.cooldown_remaining_s)
      setLoadError(false)
      return data
    } catch {
      setLoadError(true)
      return null
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // Cuenta regresiva del enfriamiento.
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => Math.max(0, c - 1)), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  // Consulta cada 3 s hasta 2 minutos mientras se espera el resultado.
  const inProgress = waiting !== null || status?.last_run?.status === 'running'
  useEffect(() => {
    if (!inProgress) return
    if (pollStart.current === 0) pollStart.current = Date.now()
    const t = setInterval(async () => {
      const data = await load()
      const last = data?.last_run
      const done = last && (waiting ? last.run_id === waiting && last.status !== 'running' : last.status !== 'running')
      if (done) {
        setWaiting(null)
        pollStart.current = 0
      } else if (Date.now() - pollStart.current > POLL_MAX_MS) {
        setWaiting(null)
        pollStart.current = 0
        setMessage({ kind: 'info', text: 'Sin confirmación del envío. Revisa el estado más tarde.' })
      }
    }, POLL_MS)
    return () => clearInterval(t)
  }, [inProgress, waiting, load])

  async function post(url: string, body: unknown) {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    let data: Record<string, unknown> = {}
    try {
      data = (await res.json()) as Record<string, unknown>
    } catch {
      /* sin cuerpo */
    }
    return { res, data }
  }

  async function doToggle() {
    if (!status) return
    setBusy('toggle'); setMessage(null)
    const { res, data } = await post('/api/summary/toggle', { enabled: !status.enabled })
    setBusy(null); setConfirm(null)
    if (!res.ok) return setMessage({ kind: 'error', text: String(data.error ?? 'Ocurrió un error. Intenta de nuevo.') })
    setStatus({ ...status, enabled: !status.enabled })
  }

  async function doSend() {
    setBusy('send'); setMessage(null)
    const { res, data } = await post('/api/summary/trigger', {})
    setBusy(null); setConfirm(null)
    if (res.status === 202 && typeof data.run_id === 'string') {
      pollStart.current = Date.now()
      setWaiting(data.run_id)
      return
    }
    if (res.status === 429) {
      setCooldown(Number(data.retry_after_s ?? 0))
      return setMessage({ kind: 'error', text: 'Espera unos segundos antes de enviar otro resumen.' })
    }
    setMessage({ kind: 'error', text: res.status === 409 ? 'Ya hay un envío en proceso.' : 'El envío no se pudo iniciar. Intenta de nuevo.' })
  }

  if (loadError && !status) return <ErrorNotice />
  if (!status) return <div className="space-y-2.5" aria-busy="true"><Skeleton className="h-20" /><Skeleton className="h-14" /><Skeleton className="h-28" /></div>

  const last = status.last_run
  const sendDisabled = busy !== null || inProgress || cooldown > 0

  return (
    <div className="space-y-2.5">
      {status.test_mode && (
        <p role="note" className="rounded-md bg-warn-bg px-3 py-2.5 text-base text-warn-fg">
          Modo de pruebas: los correos llegan solo a la cuenta de pruebas.
        </p>
      )}
      {message && (
        <p role="alert" className={`rounded-md px-3 py-2.5 text-base ${message.kind === 'error' ? 'bg-risk-bg text-risk-fg' : 'bg-info-bg text-info-fg'}`}>{message.text}</p>
      )}

      <Card><CardContent className="space-y-3 p-3.5">
        <div className="flex items-center justify-between gap-3">
          <p id="auto-label" className="text-base">Envío automático de lunes a viernes a las 7:30 (hora de Ciudad de México)</p>
          <button
            type="button" role="switch" aria-checked={status.enabled} aria-labelledby="auto-label"
            disabled={busy !== null} onClick={() => setConfirm('toggle')}
            className={`relative h-8 w-14 shrink-0 rounded-full transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60 ${status.enabled ? 'bg-primary' : 'bg-[#94A3B8]'}`}
          >
            <span className={`absolute top-1 h-6 w-6 rounded-full bg-white transition-all duration-150 ${status.enabled ? 'left-7' : 'left-1'}`} />
          </button>
        </div>
        <p className="text-sm font-medium">{status.enabled ? 'Activado' : 'Pausado'}</p>
        {confirm === 'toggle' && (
          <div role="group" aria-label="Confirmar cambio" className="space-y-2 rounded-md bg-page p-3">
            <p className="text-base">{status.enabled ? '¿Pausar el envío automático?' : '¿Activar el envío automático?'}</p>
            <div className="flex gap-2">
              <Button onClick={doToggle} disabled={busy !== null} aria-busy={busy === 'toggle'}>{busy === 'toggle' ? 'Guardando…' : 'Confirmar'}</Button>
              <Button variant="outline" onClick={() => setConfirm(null)} disabled={busy !== null}>Cancelar</Button>
            </div>
          </div>
        )}
      </CardContent></Card>

      <Button size="lg" className="h-14 w-full text-[17px]" disabled={sendDisabled} aria-busy={inProgress} onClick={() => setConfirm('send')}>
        {inProgress ? 'Enviando resumen…' : cooldown > 0 ? `Espera ${cooldown} s para enviar de nuevo` : 'Enviar ahora'}
      </Button>
      {confirm === 'send' && (
        <Card><CardContent className="space-y-2 p-3.5">
          <p className="text-base">Se enviará el resumen de hoy al equipo{status.test_mode ? ' (en modo de pruebas)' : ''}. ¿Continuar?</p>
          <div className="flex gap-2">
            <Button onClick={doSend} disabled={busy !== null} aria-busy={busy === 'send'}>{busy === 'send' ? 'Enviando…' : 'Enviar'}</Button>
            <Button variant="outline" onClick={() => setConfirm(null)} disabled={busy !== null}>Cancelar</Button>
          </div>
        </CardContent></Card>
      )}

      <Card><CardContent className="space-y-1.5 p-3.5">
        <h2 className="text-[17px] font-semibold">Última ejecución</h2>
        {!last ? <p className="text-base text-ink-soft">Aún no se ha enviado ningún resumen.</p> : (
          <>
            <p className="text-base">{fmt(last.started_at)} · {last.mode === 'scheduled' ? 'Automático' : 'Manual'}</p>
            {last.status === 'running' && <p className="text-base text-info-fg">Enviando resumen…</p>}
            {last.status === 'unconfirmed' && <p className="text-base text-warn-fg">Sin confirmación</p>}
            {last.status === 'finished' && (
              <>
                <p className="text-base"><span className="font-medium text-ok-fg">{last.sent ?? 0} enviados</span> · <span className={last.failed.length ? 'font-medium text-risk-fg' : ''}>{last.failed.length} fallidos</span></p>
                {last.failed.length > 0 && (
                  <>
                    <button type="button" onClick={() => setShowDetail((v) => !v)} className="min-h-[44px] text-base text-primary">{showDetail ? 'Ocultar detalle' : 'Ver detalle'}</button>
                    {showDetail && <ul className="space-y-1 text-sm">{last.failed.map((f, i) => <li key={i}><strong>{f.name}</strong>: {f.error}</li>)}</ul>}
                  </>
                )}
              </>
            )}
          </>
        )}
      </CardContent></Card>
    </div>
  )
}
