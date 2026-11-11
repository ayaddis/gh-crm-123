/** Quita todo lo que no sea dígito y, si quedan más de 10 y empieza con 52, quita ese prefijo. */
export function normalizePhone(input: string): string {
  let digits = input.replace(/\D/g, '')
  if (digits.length > 10 && digits.startsWith('52')) digits = digits.slice(2)
  return digits
}

export function isValidPhone(input: string): boolean {
  return normalizePhone(input).length === 10
}

/** 5512345678 → 55 1234 5678 */
export function formatPhone(phone: string): string {
  const d = normalizePhone(phone)
  if (d.length !== 10) return phone
  return `${d.slice(0, 2)} ${d.slice(2, 6)} ${d.slice(6)}`
}
