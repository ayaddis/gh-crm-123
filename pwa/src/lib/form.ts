import { z } from 'zod'

/** `secret` se usa una sola vez (contraseña temporal) y no se vuelve a mostrar. */
export type ActionState = { ok?: boolean; error?: string; secret?: string; redirectTo?: string } | undefined

export const NO_PERMISSION = 'No tienes permiso para esta acción.'
export const GENERIC_ERROR = 'Ocurrió un error. Intenta de nuevo.'

/** Texto opcional: vacío → null. */
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres`)
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional()
    .transform((v) => v ?? null)

export const requiredText = (max: number, msg = 'Campo obligatorio') => z.string().trim().min(1, msg).max(max, `Máximo ${max} caracteres`)

export const uuid = z.string().uuid()

export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida')

export const money = (msg = 'Importe inválido') =>
  z.coerce.number({ message: msg }).refine((n) => Number.isFinite(n), msg).transform((n) => Math.round(n * 100) / 100)

export function formToObject(fd: FormData): Record<string, FormDataEntryValue> {
  return Object.fromEntries(fd.entries())
}

export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Revisa los datos del formulario.'
}
