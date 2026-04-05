import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import Fastify from 'fastify'

vi.mock('../repositories/UserRepository.js', () => ({
  UserRepository: vi.fn().mockImplementation(() => ({
    upsertByEmail: vi.fn(),
  })),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({})),
}))

import { usersRoute } from '../routes/users.js'
import { UserRepository } from '../repositories/UserRepository.js'

describe('POST /api/users/login', () => {
  let app: ReturnType<typeof Fastify>

  beforeEach(async () => {
    vi.clearAllMocks()
    app = Fastify()
    app.register(usersRoute)
    await app.ready()
  })

  afterEach(() => app.close())

  it('returns user on valid email', async () => {
    const user = { id: 'u1', email: 'zach@test.com', display_name: 'zach', created_at: '2026-04-05' }
    const mockRepo = (UserRepository as any).mock.results[0].value
    mockRepo.upsertByEmail.mockResolvedValue(user)

    const res = await app.inject({
      method: 'POST',
      url: '/api/users/login',
      payload: { email: 'zach@test.com' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ user })
  })

  it('returns 400 on missing email', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/users/login',
      payload: {},
    })

    expect(res.statusCode).toBe(400)
  })

  it('returns 400 on invalid email format', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/users/login',
      payload: { email: 'not-an-email' },
    })

    expect(res.statusCode).toBe(400)
  })
})
