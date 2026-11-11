import { randomInt } from 'node:crypto'

const LOWER = 'abcdefghijkmnopqrstuvwxyz'
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const DIGITS = '23456789'
const SYMBOLS = '!@#$%*?-_'
const ALL = LOWER + UPPER + DIGITS + SYMBOLS

const pick = (chars: string) => chars[randomInt(chars.length)]

/** Contraseña temporal aleatoria (16+ caracteres, con los cuatro tipos). Se muestra una sola vez. */
export function generateTempPassword(length = 18): string {
  const chars = [pick(LOWER), pick(UPPER), pick(DIGITS), pick(SYMBOLS)]
  while (chars.length < length) chars.push(pick(ALL))
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}
