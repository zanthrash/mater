import type { FastifyPluginAsync } from 'fastify'
import Anthropic from '@anthropic-ai/sdk'
import { config } from '../config.js'
import { ImageAnalysisService, VinExtractionError } from '../services/ImageAnalysisService.js'
import type { ImageInput, TaxonomyContext } from '../services/ImageAnalysisService.js'
import { VINLookupService } from '../services/VINLookupService.js'

export const analyzeRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post('/api/analyze/images', {
    bodyLimit: 10 * 1024 * 1024, // 10MB for base64-encoded photos
    schema: {
      body: {
        type: 'object',
        required: ['photos'],
        properties: {
          photos: {
            type: 'array',
            items: {
              type: 'object',
              required: ['base64'],
              properties: {
                base64: { type: 'string' },
                type: { type: 'string' },
                mediaType: { type: 'string' },
              },
            },
          },
          taxonomy: {
            type: 'object',
            required: ['category', 'type'],
            properties: {
              category: { type: 'string' },
              type: { type: 'string' },
              subtype: { type: 'string', nullable: true },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const body = request.body as {
        photos: Array<{ base64: string; type?: string; mediaType?: string }>
        taxonomy?: TaxonomyContext
      }
      const { photos, taxonomy } = body

      const anthropic = new Anthropic({ apiKey: config.anthropicApiKey })
      const analysisService = new ImageAnalysisService(anthropic)

      const imageInputs: ImageInput[] = photos.map((photo) => ({
        base64: photo.base64,
        mediaType: (photo.mediaType as ImageInput['mediaType']) ?? 'image/jpeg',
      }))

      const result = await analysisService.analyzeImages(imageInputs, taxonomy ?? null)

      return reply.send(result)
    } catch (error) {
      const err = error as Error
      return reply.status(500).send({ error: err.message })
    }
  })

  fastify.post('/api/analyze/vin', {
    schema: {
      body: {
        type: 'object',
        required: ['vin'],
        properties: {
          vin: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { vin } = request.body as { vin: string }
      const anthropic = new Anthropic({ apiKey: config.anthropicApiKey })
      const vinService = new VINLookupService(anthropic)
      const result = await vinService.lookupVin(vin)
      return reply.send(result)
    } catch (error) {
      const err = error as Error
      return reply.status(500).send({ error: err.message })
    }
  })

  fastify.post('/api/analyze/vin-ocr', {
    schema: {
      body: {
        type: 'object',
        required: ['image'],
        properties: {
          image: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { image } = request.body as { image: string }
      const anthropic = new Anthropic({ apiKey: config.anthropicApiKey })
      const analysisService = new ImageAnalysisService(anthropic)
      const vin = await analysisService.extractVinFromImage(image)
      return reply.send({ vin })
    } catch (error) {
      if (error instanceof VinExtractionError) {
        return reply.status(422).send({ error: error.message })
      }
      const err = error as Error
      return reply.status(500).send({ error: err.message })
    }
  })

  fastify.post('/api/analyze/classify', {
    bodyLimit: 10 * 1024 * 1024,
    schema: {
      body: {
        type: 'object',
        required: ['photos'],
        properties: {
          photos: {
            type: 'array',
            items: {
              type: 'object',
              required: ['base64'],
              properties: {
                base64: { type: 'string' },
                mediaType: { type: 'string' },
              },
            },
          },
          vinSerial: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { photos, vinSerial } = request.body as { photos: Array<{ base64: string; mediaType?: string }>; vinSerial?: string }
      const anthropic = new Anthropic({ apiKey: config.anthropicApiKey })
      const analysisService = new ImageAnalysisService(anthropic)

      const imageInputs: ImageInput[] = photos.map((photo) => ({
        base64: photo.base64,
        mediaType: (photo.mediaType as ImageInput['mediaType']) ?? 'image/jpeg',
      }))

      const result = await analysisService.classifyEquipment(imageInputs, vinSerial ?? null)
      return reply.send(result)
    } catch (error) {
      const err = error as Error
      return reply.status(500).send({ error: err.message })
    }
  })
}
