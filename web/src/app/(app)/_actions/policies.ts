'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient as createSupabase } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/session'
import { mapDbError } from '@/lib/db-errors'
import type { TablesInsert } from '@/types/database'
import { ActionState, NO_PERMISSION, firstIssue, formToObject, isoDate, money, requiredText, uuid } from '@/lib/form'

const issueSchema = z
  .object({
    opportunity_id: uuid,
    insurer_id: uuid,
    agent_id: z.union([uuid, z.literal('')]).transform((v) => (v === '' ? null : v)),
    policy_number: requiredText(60, 'El número de póliza es obligatorio'),
    annual_premium: money('La prima anual es inválida').refine((n) => n > 0, 'La prima anual debe ser mayor a cero'),
    payment_frequency: z.enum(['anual', 'semestral', 'trimestral', 'mensual']),
    start_date: isoDate,
    end_date: isoDate,
  })
  .refine((v) => v.end_date > v.start_date, { message: 'El fin de vigencia debe ser posterior al inicio', path: ['end_date'] })

/** Solo se envían los campos permitidos; el resto (cliente, producto, responsable, recibos, porcentajes) lo copia la base. */
export async function issuePolicy(_p: ActionState, fd: FormData): Promise<ActionState> {
  const profile = await requireProfile()
  if (!profile) return { error: NO_PERMISSION }
  const parsed = issueSchema.safeParse(formToObject(fd))
  if (!parsed.success) return { error: firstIssue(parsed.error) }

  const supabase = await createSupabase()
  const { data, error } = await supabase
    .from('policies')
    // Solo se envían estos campos; cliente, producto y responsable los copia la base desde la oportunidad.
    .insert({
      opportunity_id: parsed.data.opportunity_id,
      insurer_id: parsed.data.insurer_id,
      agent_id: parsed.data.agent_id,
      policy_number: parsed.data.policy_number,
      annual_premium: parsed.data.annual_premium,
      payment_frequency: parsed.data.payment_frequency,
      start_date: parsed.data.start_date,
      end_date: parsed.data.end_date,
    } as TablesInsert<'policies'>)
    .select('id')
    .single()
  if (error) {
    if (error.code === '23505') return { error: 'Ya existe una póliza con ese número para esa aseguradora, o la oportunidad ya tiene una póliza.' }
    return { error: mapDbError(error) }
  }
  revalidatePath('/polizas')
  revalidatePath('/oportunidades')
  redirect(`/polizas/${data.id}`)
}

const cancelSchema = z.object({ id: uuid, reason: requiredText(500, 'El motivo de cancelación es obligatorio') })

export async function cancelPolicy(_p: ActionState, fd: FormData): Promise<ActionState> {
  const profile = await requireProfile()
  if (!profile) return { error: NO_PERMISSION }
  const parsed = cancelSchema.safeParse(formToObject(fd))
  if (!parsed.success) return { error: firstIssue(parsed.error) }
  const supabase = await createSupabase()
  const { error } = await supabase
    .from('policies')
    .update({ status: 'cancelada', cancelled_at: new Date().toISOString(), cancellation_reason: parsed.data.reason })
    .eq('id', parsed.data.id)
  if (error) return { error: mapDbError(error) }
  revalidatePath('/polizas')
  revalidatePath(`/polizas/${parsed.data.id}`)
  revalidatePath('/cobranza')
  return { ok: true }
}
