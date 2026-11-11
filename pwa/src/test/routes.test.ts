import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('server-only', () => ({}))

const SECRET = 'a'.repeat(64)
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'valor-de-prueba-' + 'x'.repeat(30)
process.env.NEXT_PUBLIC_APP_NAME = 'CRM-123'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'valor-de-prueba-' + 'y'.repeat(30)
process.env.N8N_WEBHOOK_URL = 'https://n8n.example.com/webhook/x'
process.env.N8N_WEBHOOK_SECRET = 'b'.repeat(64)
process.env.N8N_API_SECRET = SECRET
process.env.MODO_PRUEBA = 'true'
process.env.TEST_RECIPIENT_EMAIL = 'prueba@example.com'
process.env.RESEND_FROM_EMAIL = 'onboarding@resend.dev'

const session = vi.hoisted(() => ({ supervisor: null as unknown }))
vi.mock('@/lib/session', () => ({ requireSupervisor: async () => session.supervisor, requireProfile: async () => session.supervisor }))

// Cliente de Supabase simulado: toda consulta devuelve vacío.
const emptyQuery: Record<string, unknown> = {}
const chain: unknown = new Proxy(emptyQuery, {
  get: (_t, prop) => {
    if (prop === 'then') return (resolve: (v: unknown) => void) => resolve({ data: [], error: null })
    return () => chain
  },
})
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({ from: () => chain, rpc: async () => ({ data: null, error: null }) }) }))
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ from: () => chain }) }))

const req = (url: string, init: ConstructorParameters<typeof NextRequest>[1] = {}) => new NextRequest(url, init)

describe('POST /api/summary/trigger', () => {
  beforeEach(() => { session.supervisor = null })

  it('rechaza con 403 a quien no es Supervisor (p. ej. un vendedor)', async () => {
    const { POST } = await import('@/app/api/summary/trigger/route')
    const res = await POST(req('https://pwa.example.com/api/summary/trigger', { method: 'POST', headers: { origin: 'https://pwa.example.com', host: 'pwa.example.com', 'content-type': 'application/json' }, body: '{}' }))
    expect(res.status).toBe(403)
  })

  it('rechaza con 403 un origen distinto aunque sea Supervisor', async () => {
    session.supervisor = { id: 'u1', role: 'supervisor', is_active: true }
    const { POST } = await import('@/app/api/summary/trigger/route')
    const res = await POST(req('https://pwa.example.com/api/summary/trigger', { method: 'POST', headers: { origin: 'https://malo.example.com', host: 'pwa.example.com', 'content-type': 'application/json' }, body: '{}' }))
    expect(res.status).toBe(403)
  })
})

describe('GET /api/n8n/summary-data', () => {
  const url = 'https://pwa.example.com/api/n8n/summary-data?mode=manual&run_id=00000000-0000-4000-8000-000000000000'

  it('401 sin cabecera de secreto', async () => {
    const { GET } = await import('@/app/api/n8n/summary-data/route')
    const res = await GET(req(url))
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'unauthorized' })
  })

  it('401 con secreto incorrecto', async () => {
    const { GET } = await import('@/app/api/n8n/summary-data/route')
    expect((await GET(req(url, { headers: { 'x-n8n-secret': 'c'.repeat(64) } }))).status).toBe(401)
  })

  it('invalid_run con secreto correcto y un run_id que nadie solicitó', async () => {
    const { GET } = await import('@/app/api/n8n/summary-data/route')
    const res = await GET(req(url, { headers: { 'x-n8n-secret': SECRET } }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ skipped: true, reason: 'invalid_run' })
  })
})

describe('POST /api/n8n/run-report', () => {
  it('401 sin secreto', async () => {
    const { POST } = await import('@/app/api/n8n/run-report/route')
    expect((await POST(req('https://pwa.example.com/api/n8n/run-report', { method: 'POST', body: '{}' }))).status).toBe(401)
  })
})
