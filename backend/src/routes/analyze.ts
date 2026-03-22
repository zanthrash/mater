import type { FastifyPluginAsync } from 'fastify'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { config } from '../config.js'
import { PhotoStorageService } from '../services/PhotoStorageService.js'
import { ImageAnalysisService } from '../services/ImageAnalysisService.js'
import type { ImageInput } from '../services/ImageAnalysisService.js'

interface AnalyzeBody {
  inspectionId: string
  photos: Array<{
    base64: string
    type: string
    mediaType?: string
  }>
}

export const analyzeRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post('/api/analyze/images', {
    schema: {
      body: {
        type: 'object',
        required: ['inspectionId', 'photos'],
        properties: {
          inspectionId: { type: 'string' },
          photos: {
            type: 'array',
            items: {
              type: 'object',
              required: ['base64', 'type'],
              properties: {
                base64: { type: 'string' },
                type: { type: 'string' },
                mediaType: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const body = request.body as AnalyzeBody
      const { inspectionId, photos } = body

      const supabase = createClient(config.supabaseUrl, config.supabaseKey)
      const anthropic = new Anthropic({ apiKey: config.anthropicApiKey })
      const photoService = new PhotoStorageService(supabase)
      const analysisService = new ImageAnalysisService(anthropic)

      const storedPhotos = await photoService.uploadPhotos(inspectionId, photos)

      const imageInputs: ImageInput[] = photos.map((photo) => ({
        base64: photo.base64,
        mediaType: (photo.mediaType as ImageInput['mediaType']) ?? 'image/jpeg',
      }))

      const analysis = await analysisService.analyzeImages(imageInputs)

      return reply.send({ storedPhotos, analysis })
    } catch (error) {
      const err = error as Error
      return reply.status(500).send({ error: err.message })
    }
  })
}
