import Fastify from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import { healthRoute } from './routes/health.js'
import { analyzeRoute } from './routes/analyze.js'
import { assetsRoute } from './routes/assets.js'
import { taxonomyRoute } from './routes/taxonomy.js'
import { usersRoute } from './routes/users.js'
import { dashboardRoute } from './routes/dashboard.js'
import { voiceNotesRoute } from './routes/voiceNotes.js'

export function buildApp({ logger = false }: { logger?: boolean } = {}) {
  const app = Fastify({ logger })
  app.register(cors)
  app.register(multipart)
  app.register(healthRoute)
  app.register(analyzeRoute)
  app.register(assetsRoute)
  app.register(taxonomyRoute)
  app.register(usersRoute)
  app.register(dashboardRoute)
  app.register(voiceNotesRoute)
  return app
}
