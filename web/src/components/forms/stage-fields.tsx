'use client'
import { useState } from 'react'
import { SelectField, TextAreaField } from '@/components/field'
import { LABELS, options } from '@/lib/labels'

/** Selector de etapa; "Perdida" exige motivo. */
export function StageFields({ current }: { current: string }) {
  const [stage, setStage] = useState(current)
  return (
    <>
      <SelectField label="Etapa" name="stage" value={stage} onChange={(e) => setStage(e.target.value)} options={options(LABELS.stage)} />
      {stage === 'perdida' && <TextAreaField label="Motivo de pérdida" name="lost_reason" maxLength={500} required />}
      {stage === 'ganada' && <p className="text-xs text-ink-soft">Al guardar se abrirá la emisión de la póliza.</p>}
    </>
  )
}
