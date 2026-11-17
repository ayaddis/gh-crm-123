import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const KEYS = ['SUPABASE_SERVICE_ROLE_KEY', 'N8N_WEBHOOK_URL', 'N8N_WEBHOOK_SECRET', 'N8N_API_SECRET', 'MODO_PRUEBA', 'TEST_RECIPIENT_EMAIL', 'RESEND_FROM_EMAIL'] as const
const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]))

afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k]
    else process.env[k] = saved[k]
  }
})

describe('serverEnvIssues', () => {
  it('lista solo nombres de variables faltantes', async () => {
    for (const k of KEYS) delete process.env[k]
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'x'.repeat(30)
    process.env.N8N_WEBHOOK_SECRET = 'a'.repeat(64)
    process.env.N8N_API_SECRET = 'b'.repeat(64)
    process.env.MODO_PRUEBA = 'true'
    process.env.TEST_RECIPIENT_EMAIL = 'prueba@example.com'
    process.env.RESEND_FROM_EMAIL = 'onboarding@resend.dev'
    const { serverEnvIssues } = await import('./env.server')
    const issues = serverEnvIssues()
    expect(issues).toEqual(['N8N_WEBHOOK_URL'])
    expect(issues.join(' ')).not.toContain('xxx')
  })
  it('vacío cuando todo está bien', async () => {
    process.env.N8N_WEBHOOK_URL = 'https://n8n.example.com/webhook/x'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'x'.repeat(30)
    process.env.N8N_WEBHOOK_SECRET = 'a'.repeat(64)
    process.env.N8N_API_SECRET = 'b'.repeat(64)
    process.env.MODO_PRUEBA = 'true'
    process.env.TEST_RECIPIENT_EMAIL = 'prueba@example.com'
    process.env.RESEND_FROM_EMAIL = 'onboarding@resend.dev'
    const { serverEnvIssues } = await import('./env.server')
    expect(serverEnvIssues()).toEqual([])
  })
})
