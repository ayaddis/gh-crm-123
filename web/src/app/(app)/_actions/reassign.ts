'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireSupervisor } from '@/lib/session'
import { mapDbError } from '@/lib/db-errors'
import { ActionState, NO_PERMISSION, firstIssue, formToObject, uuid } from '@/lib/form'

/** Reasigna un cliente con la función de la base (solo Supervisor; deja bitácora). */
export async function reassignClient(_p: ActionState, fd: FormData): Promise<ActionState> {
  if (!(await requireSupervisor())) return { error: NO_PERMISSION }
  const parsed = z.object({ client_id: uuid, new_owner_id: uuid }).safeParse(formToObject(fd))
  if (!parsed.success) return { error: firstIssue(parsed.error) }
  const supabase = await createClient()
  const { error } = await supabase.rpc('reassign_client', { p_client_id: parsed.data.client_id, p_new_owner_id: parsed.data.new_owner_id })
  if (error) return { error: mapDbError(error) }
  revalidatePath('/clientes')
  revalidatePath(`/clientes/${parsed.data.client_id}`)
  revalidatePath('/')
  return { ok: true }
}
