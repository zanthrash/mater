import type { FastifyPluginAsync } from 'fastify'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { config } from '../config.js'
import { ImageAnalysisService, VinExtractionError } from '../services/ImageAnalysisService.js'
import type { ImageInput, TaxonomyContext } from '../services/ImageAnalysisService.js'
import { VINLookupService } from '../services/VINLookupService.js'
import { AiUsageRepository, calculateCostCents } from '../repositories/AiUsageRepository.js'

export const analyzeRoute: FastifyPluginAsync = async (fastify) => {
  const supabase = createClient(config.supabaseUrl!, config.supabaseKey!)
  const usageRepo = new AiUsageRepository(supabase)

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

      const { result, usage } = await analysisService.analyzeImages(imageInputs, taxonomy ?? null)

      usageRepo.insertUsage({
        operation: 'analyze',
        model: 'claude-sonnet-4-6',
        input_tokens: usage.input_tokens,
        output_tokens: usage.output_tokens,
        cost_cents: calculateCostCents(usage.input_tokens, usage.output_tokens),
      }).catch((err: Error) => fastify.log.error(err, 'Failed to record AI usage'))

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
      const { result, usage } = await vinService.lookupVin(vin)

      if (usage.input_tokens > 0) {
        usageRepo.insertUsage({
          operation: 'vin-lookup',
          model: 'claude-sonnet-4-6',
          input_tokens: usage.input_tokens,
          output_tokens: usage.output_tokens,
          cost_cents: calculateCostCents(usage.input_tokens, usage.output_tokens),
        }).catch((err: Error) => fastify.log.error(err, 'Failed to record AI usage'))
      }

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
      const { result: vin, usage } = await analysisService.extractVinFromImage(image)

      usageRepo.insertUsage({
        operation: 'vin-ocr',
        model: 'claude-sonnet-4-6',
        input_tokens: usage.input_tokens,
        output_tokens: usage.output_tokens,
        cost_cents: calculateCostCents(usage.input_tokens, usage.output_tokens),
      }).catch((err: Error) => fastify.log.error(err, 'Failed to record AI usage'))

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

      const { result, usage } = await analysisService.classifyEquipment(imageInputs, vinSerial ?? null)

      usageRepo.insertUsage({
        operation: 'classify',
        model: 'claude-sonnet-4-6',
        input_tokens: usage.input_tokens,
        output_tokens: usage.output_tokens,
        cost_cents: calculateCostCents(usage.input_tokens, usage.output_tokens),
      }).catch((err: Error) => fastify.log.error(err, 'Failed to record AI usage'))

      return reply.send(result)
    } catch (error) {
      const err = error as Error
      return reply.status(500).send({ error: err.message })
    }
  })
}
