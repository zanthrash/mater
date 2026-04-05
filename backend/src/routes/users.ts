import type { FastifyPluginAsync } from 'fastify'
import { createClient } from '@supabase/supabase-js'
import { config } from '../config.js'
import { UserRepository } from '../repositories/UserRepository.js'

interface LoginBody {
  email: string
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const usersRoute: FastifyPluginAsync = async (app) => {
  const supabase = createClient(config.supabaseUrl!, config.supabaseKey!)
  const repo = new UserRepository(supabase)

  app.post<{ Body: LoginBody }>('/api/users/login', {
    schema: {
      body: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const { email } = request.body

    if (!EMAIL_REGEX.test(email)) {
      return reply.status(400).send({ error: 'Invalid email format' })
    }

    try {
      const user = await repo.upsertByEmail(email.toLowerCase().trim())
      return { user }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed'
      return reply.status(500).send({ error: message })
    }
  })
}
