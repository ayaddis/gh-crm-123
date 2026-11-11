import { SelectField, TextAreaField, TextField } from '@/components/field'
import { LABELS, options } from '@/lib/labels'

type Opt = { value: string; text: string }

export function ClientFields({
  client, owners,
}: {
  client?: { full_name: string; phone: string; email: string | null; company: string | null; city_state: string | null; source: string | null; notes: string | null; owner_id?: string }
  owners?: Opt[]
}) {
  return (
    <>
      <TextField label="Nombre completo" name="full_name" defaultValue={client?.full_name} maxLength={120} required />
      <TextField label="Teléfono" name="phone" defaultValue={client?.phone} inputMode="tel" placeholder="55 1234 5678" hint="10 dígitos; identifica al cliente." required />
      <TextField label="Correo" name="email" type="email" defaultValue={client?.email ?? ''} maxLength={254} />
      <TextField label="Empresa" name="company" defaultValue={client?.company ?? ''} maxLength={120} />
      <TextField label="Ciudad/Estado" name="city_state" defaultValue={client?.city_state ?? ''} maxLength={120} />
      <SelectField label="Origen" name="source" defaultValue={client?.source ?? ''} placeholder="Sin especificar" options={options(LABELS.source)} />
      {owners && <SelectField label="Responsable" name="owner_id" options={owners} defaultValue={client?.owner_id} />}
      <TextAreaField label="Notas" name="notes" defaultValue={client?.notes ?? ''} maxLength={2000} />
    </>
  )
}

export function OpportunityFields({
  products, opportunity,
}: {
  products: Opt[]
  opportunity?: { product_id: string; estimated_annual_premium: number; estimated_close_date: string | null }
}) {
  return (
    <>
      <SelectField label="Producto" name="product_id" options={products} defaultValue={opportunity?.product_id} required />
      <TextField label="Prima anual estimada (MXN)" name="estimated_annual_premium" type="number" step="0.01" min="0" defaultValue={opportunity?.estimated_annual_premium} required />
      <TextField label="Fecha estimada de cierre" name="estimated_close_date" type="date" defaultValue={opportunity?.estimated_close_date ?? ''} />
    </>
  )
}

export function ActivityFields({ opportunityId }: { opportunityId?: string }) {
  return (
    <>
      {opportunityId && <input type="hidden" name="opportunity_id" value={opportunityId} />}
      <SelectField label="Tipo" name="type" options={options(LABELS.activity)} />
      <TextAreaField label="Resumen" name="summary" maxLength={1000} required />
    </>
  )
}

export function FollowUpFields({ opportunityId, minDate }: { opportunityId?: string; minDate?: string }) {
  return (
    <>
      {opportunityId && <input type="hidden" name="opportunity_id" value={opportunityId} />}
      <TextField label="Fecha" name="due_date" type="date" min={minDate} required />
      <TextAreaField label="Nota" name="note" maxLength={2000} />
    </>
  )
}
