import Fastify from 'fastify'
import cors from '@fastify/cors'
import { healthRoute } from './routes/health.js'
import { analyzeRoute } from './routes/analyze.js'
import { assetsRoute } from './routes/assets.js'
import { taxonomyRoute } from './routes/taxonomy.js'

export function buildApp({ logger = false }: { logger?: boolean } = {}) {
  const app = Fastify({ logger })
  app.register(cors)
  app.register(healthRoute)
  app.register(analyzeRoute)
  app.register(assetsRoute)
  app.register(taxonomyRoute)
  return app
}
