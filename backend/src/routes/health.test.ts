import { describe, it, expect, vi } from 'vitest'
import { buildApp } from '../app.js'

vi.mock('../config.js', () => ({
  config: {
    supabaseUrl: 'http://localhost:54321',
    supabaseKey: 'test-service-key',
    anthropicApiKey: 'test-anthropic-key',
  },
}))

vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn(() => ({})) }))

describe('GET /health', () => {
  it('returns { status: "ok" } with 200', async () => {
    const app = buildApp()
    const response = await app.inject({ method: 'GET', url: '/health' })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ status: 'ok' })
    await app.close()
  })
})
