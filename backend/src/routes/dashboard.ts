import type { FastifyPluginAsync } from 'fastify'
import { createClient } from '@supabase/supabase-js'
import { config } from '../config.js'
import { DashboardRepository } from '../repositories/DashboardRepository.js'
import type { Period } from '../repositories/DashboardRepository.js'

interface PeriodQuery {
  period?: string
}

interface ActivityQuery {
  limit?: string
  since?: string
}

export const dashboardRoute: FastifyPluginAsync = async (fastify) => {
  const supabase = createClient(config.supabaseUrl!, config.supabaseKey!)
  const repo = new DashboardRepository(supabase)

  const parsePeriod = (raw?: string): Period => {
    if (raw === 'today' || raw === 'week' || raw === 'month') return raw
    return 'today'
  }

  fastify.get<{ Querystring: PeriodQuery }>('/api/dashboard/stats', async (request, reply) => {
    try {
      const period = parsePeriod(request.query.period)
      const stats = await repo.getStats(period)
      return reply.send(stats)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return reply.status(500).send({ error: message })
    }
  })

  fastify.get<{ Querystring: PeriodQuery }>('/api/dashboard/intake-volume', async (request, reply) => {
    try {
      const period = parsePeriod(request.query.period)
      const buckets = await repo.getIntakeVolume(period)
      return reply.send({ buckets })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return reply.status(500).send({ error: message })
    }
  })

  fastify.get<{ Querystring: PeriodQuery }>('/api/dashboard/category-breakdown', async (request, reply) => {
    try {
      const period = parsePeriod(request.query.period)
      const categories = await repo.getCategoryBreakdown(period)
      return reply.send({ categories })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return reply.status(500).send({ error: message })
    }
  })

  fastify.get<{ Querystring: PeriodQuery }>('/api/dashboard/operators', async (request, reply) => {
    try {
      const period = parsePeriod(request.query.period)
      const operators = await repo.getOperatorStats(period)
      return reply.send({ operators })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return reply.status(500).send({ error: message })
    }
  })

  fastify.get<{ Querystring: PeriodQuery }>('/api/dashboard/ai-insights', async (request, reply) => {
    try {
      const period = parsePeriod(request.query.period)
      const insights = await repo.getAiInsights(period)
      return reply.send(insights)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return reply.status(500).send({ error: message })
    }
  })

  fastify.get<{ Querystring: ActivityQuery }>('/api/dashboard/activity', async (request, reply) => {
    try {
      const limit = request.query.limit ? parseInt(request.query.limit, 10) : 20
      const events = await repo.getRecentActivity(limit, request.query.since)
      return reply.send({ events })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return reply.status(500).send({ error: message })
    }
  })
}
