'use client'
import { useRef } from 'react'
import { Button } from '@/components/ui/button'

type Json = Record<string, unknown> | null

function changes(oldData: Json, newData: Json, details: Json): { field: string; before: string; after: string }[] {
  const str = (v: unknown) => (v === null || v === undefined ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v))
  if (oldData && newData) {
    return Object.keys(newData)
      .filter((k) => k !== 'updated_at' && JSON.stringify(oldData[k]) !== JSON.stringify(newData[k]))
      .map((k) => ({ field: k, before: str(oldData[k]), after: str(newData[k]) }))
  }
  const source = newData ?? details ?? {}
  return Object.entries(source).map(([k, v]) => ({ field: k, before: '—', after: str(v) }))
}

/** Panel lateral de solo lectura: antes y después de los campos que cambiaron. */
export function AuditDetail({ oldData, newData, details }: { oldData: Json; newData: Json; details: Json }) {
  const ref = useRef<HTMLDialogElement>(null)
  const rows = changes(oldData, newData, details)
  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => ref.current?.showModal()}>Ver detalle</Button>
      <dialog ref={ref} aria-label="Detalle del registro" onClick={(e) => { if (e.target === ref.current) ref.current?.close() }}
        className="m-0 ml-auto hidden h-screen w-[440px] max-w-full bg-transparent p-0 backdrop:bg-[rgba(15,23,42,0.28)] open:flex">
        <div className="flex h-screen w-full flex-col bg-white">
          <div className="border-b border-line px-5 py-4"><h2 className="text-[17px] font-semibold">Detalle del registro</h2></div>
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {rows.length === 0 ? <p className="text-sm text-ink-soft">Sin cambios de campos.</p> : (
              <dl className="space-y-3 text-[13px]">
                {rows.map((r) => (
                  <div key={r.field}><dt className="text-xs font-semibold text-ink-soft">{r.field}</dt><dd className="break-all"><span className="text-ink-soft">{r.before}</span> → <span className="font-medium">{r.after}</span></dd></div>
                ))}
              </dl>
            )}
          </div>
          <div className="flex justify-end border-t border-line px-5 py-3"><Button type="button" variant="outline" onClick={() => ref.current?.close()}>Cerrar</Button></div>
        </div>
      </dialog>
    </>
  )
}
