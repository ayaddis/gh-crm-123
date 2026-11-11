import 'server-only'
import { NextResponse, type NextRequest } from 'next/server'
import { safeEqual } from '@/lib/safe-equal'
import { serverEnv } from '@/lib/env.server'

/** Respuesta JSON sin caché. */
export function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}

/** El origen de la petición debe ser la propia PWA (Origin o Sec-Fetch-Site). */
export function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin')
  if (origin) {
    const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
    try {
      return new URL(origin).host === host
    } catch {
      return false
    }
  }
  return request.headers.get('sec-fetch-site') === 'same-origin'
}

/** Autenticación de /api/n8n/*: cabecera x-n8n-secret comparada en tiempo constante. */
export function n8nUnauthorized(request: NextRequest): NextResponse | null {
  const received = request.headers.get('x-n8n-secret') ?? ''
  let ok = false
  try {
    ok = safeEqual(received, serverEnv().N8N_API_SECRET)
  } catch {
    ok = false
  }
  if (!ok) {
    console.warn('n8n: solicitud no autorizada') // solo el hecho, nunca el valor recibido
    return json({ error: 'unauthorized' }, 401)
  }
  return null
}

export const MAX_BODY_BYTES = 64 * 1024

/** Lee el cuerpo JSON con límite de 64 KB. */
export async function readJsonBody(request: NextRequest): Promise<unknown | null> {
  const text = await request.text()
  if (Buffer.byteLength(text) > MAX_BODY_BYTES) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

