import type { FastifyPluginAsync } from 'fastify'
import { createClient } from '@supabase/supabase-js'
import { config } from '../config.js'
import { TaxonomyRepository } from '../repositories/TaxonomyRepository.js'

export const taxonomyRoute: FastifyPluginAsync = async (fastify) => {
  const supabase = createClient(config.supabaseUrl, config.supabaseKey)
  const repo = new TaxonomyRepository(supabase)

  fastify.get('/api/taxonomy', async (request, reply) => {
    try {
      const tree = await repo.getTree()
      return reply.send(tree)
    } catch (error) {
      const err = error as Error
      return reply.status(500).send({ error: err.message })
    }
  })
}
