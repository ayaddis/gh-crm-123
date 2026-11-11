import { createHash, timingSafeEqual } from 'node:crypto'

/** Compara secretos en tiempo constante sobre el hash SHA-256 (así tienen igual longitud). */
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb)
}
