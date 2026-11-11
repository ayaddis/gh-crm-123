import { SelectField, TextAreaField, TextField } from '@/components/field'
import { LABELS, options } from '@/lib/labels'

export function ClaimFields({ policies, today, policyId }: { policies?: { value: string; text: string }[]; today: string; policyId?: string }) {
  return (
    <>
      {policyId ? <input type="hidden" name="policy_id" value={policyId} /> : <SelectField label="Póliza" name="policy_id" options={policies ?? []} placeholder="Selecciona…" required />}
      <TextField label="Fecha del evento" name="event_date" type="date" max={today} required />
      <TextAreaField label="Descripción" name="description" maxLength={2000} required />
      <TextField label="N.º de siniestro de la aseguradora (opcional)" name="insurer_claim_number" maxLength={60} />
    </>
  )
}

export function ClaimStatusFields({ current }: { current: string }) {
  return <SelectField label="Estatus" name="status" defaultValue={current} options={options(LABELS.claim)} />
}
