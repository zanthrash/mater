import Fastify from 'fastify'
import cors from '@fastify/cors'
import { healthRoute } from './routes/health.js'
import { analyzeRoute } from './routes/analyze.js'

export function buildApp({ logger = false }: { logger?: boolean } = {}) {
  const app = Fastify({ logger })
  app.register(cors)
  app.register(healthRoute)
  app.register(analyzeRoute)
  return app
}
