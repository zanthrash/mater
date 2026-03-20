import Fastify from 'fastify'
import cors from '@fastify/cors'
import { healthRoute } from './routes/health.js'

export function buildApp({ logger = false }: { logger?: boolean } = {}) {
  const app = Fastify({ logger })
  app.register(cors)
  app.register(healthRoute)
  return app
}
