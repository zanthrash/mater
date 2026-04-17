import type { FastifyPluginAsync } from 'fastify'
import { createClient } from '@supabase/supabase-js'
import { config } from '../config.js'
import { AssetRepository, NotFoundError } from '../repositories/AssetRepository.js'
import { PhotoStorageService } from '../services/PhotoStorageService.js'
import { UserRepository } from '../repositories/UserRepository.js'
import { PendingVoiceNoteRepository } from '../repositories/PendingVoiceNoteRepository.js'
import { VoiceNoteStorageService } from '../services/VoiceNoteStorageService.js'

interface PhotoInput {
  base64: string
  label: string
  type: 'guided' | 'extra'
  mediaType?: string
}

interface PostBody {
  vinSerial?: string
  operatorName?: string
  userId?: string
  gpsLat?: number
  gpsLon?: number
  photos: PhotoInput[]
  taxonomy?: { category: string; type: string; subtype?: string | null }
  coreSpecs?: {
    make?: string
    model?: string
    year?: number
    engineType?: string
    transmission?: string
    gvwLbs?: number
    hoursOnMeter?: number
  }
  typeSpecificSpecs?: Record<string, string | number | null>
  yardMetadata?: { lotNumber?: string; yardLocation?: string; consignor?: string }
  aiAnalysisResult?: Record<string, unknown> | null
  vinLookupResult?: Record<string, unknown> | null
  aiTaxonomyResult?: Record<string, unknown> | null
  voiceNoteSessionId?: string
}

interface IdParams {
  id: string
}

interface ListQuery {
  category?: string
  type?: string
  make?: string
  status?: string
  search?: string
  limit?: number
  offset?: number
  userId?: string
}

export const assetsRoute: FastifyPluginAsync = async (fastify) => {
  const supabase = createClient(config.supabaseUrl, config.supabaseKey)
  const repo = new AssetRepository(supabase)
  const userRepo = new UserRepository(supabase)
  const photoService = new PhotoStorageService(supabase)
  const pendingVoiceNoteRepo = new PendingVoiceNoteRepository(supabase)
  const voiceNoteStorage = new VoiceNoteStorageService(supabase)

  // POST /api/assets
  fastify.post<{ Body: PostBody }>(
    '/api/assets',
    {
      bodyLimit: 10 * 1024 * 1024,
      schema: {
        body: {
          type: 'object',
          required: ['photos'],
          properties: {
            vinSerial: { type: 'string' },
            operatorName: { type: 'string' },
            userId: { type: 'string' },
            gpsLat: { type: 'number' },
            gpsLon: { type: 'number' },
            photos: {
              type: 'array',
              items: {
                type: 'object',
                required: ['base64', 'label', 'type'],
                properties: {
                  base64: { type: 'string' },
                  label: { type: 'string' },
                  type: { type: 'string', enum: ['guided', 'extra'] },
                  mediaType: { type: 'string' },
                },
              },
            },
            taxonomy: {
              type: 'object',
              properties: {
                category: { type: 'string' },
                type: { type: 'string' },
                subtype: { type: ['string', 'null'] },
              },
            },
            coreSpecs: { type: 'object' },
            typeSpecificSpecs: { type: 'object' },
            yardMetadata: { type: 'object' },
            aiAnalysisResult: { type: ['object', 'null'] },
            vinLookupResult: { type: ['object', 'null'] },
            aiTaxonomyResult: { type: ['object', 'null'] },
            voiceNoteSessionId: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const body = request.body

        let operatorName = body.operatorName
        if (!operatorName && body.userId) {
          try {
            const user = await userRepo.findById(body.userId)
            operatorName = user.display_name
          } catch { }
        }

        // 1. Create asset without photos to get ID
        const asset = await repo.create({
          vin_serial: body.vinSerial ?? null,
          category: body.taxonomy?.category ?? null,
          type: body.taxonomy?.type ?? null,
          subtype: body.taxonomy?.subtype ?? null,
          make: body.coreSpecs?.make ?? null,
          model: body.coreSpecs?.model ?? null,
          year: body.coreSpecs?.year ?? null,
          engine_type: body.coreSpecs?.engineType ?? null,
          transmission: body.coreSpecs?.transmission ?? null,
          gvw_lbs: body.coreSpecs?.gvwLbs ?? null,
          hours_on_meter: body.coreSpecs?.hoursOnMeter ?? null,
          type_specific_specs: body.typeSpecificSpecs ?? {},
          lot_number: body.yardMetadata?.lotNumber ?? null,
          yard_location: body.yardMetadata?.yardLocation ?? null,
          consignor: body.yardMetadata?.consignor ?? null,
          photos: [],
          voice_notes: [],
          status: 'intake',
          user_id: body.userId ?? null,
        })

        // 2. Upload photos using asset.id as folder
        const uploadPayload = body.photos.map((p) => ({ base64: p.base64, type: p.label }))
        const storedPhotosRaw = await photoService.uploadPhotos(asset.id, uploadPayload)
        const storedPhotos = storedPhotosRaw.map((sp, idx) => ({
          url: sp.url,
          label: body.photos[idx].label,
          type: body.photos[idx].type,
        }))

        // 3. Update asset with photos
        let updatedAsset = await repo.update(asset.id, { photos: storedPhotos })

        // 3b. Move voice notes from temp to asset path
        if (body.voiceNoteSessionId) {
          const pendingNotes = await pendingVoiceNoteRepo.findBySessionId(body.voiceNoteSessionId)
          if (pendingNotes.length > 0) {
            const voiceNotes = await Promise.all(
              pendingNotes.map(async (note) => {
                const url = await voiceNoteStorage.moveToAsset(note.temp_path, asset.id)
                return {
                  url,
                  transcript: note.transcript,
                  duration_seconds: note.duration_seconds,
                  recorded_at: note.recorded_at,
                }
              })
            )
            updatedAsset = await repo.update(asset.id, { voice_notes: voiceNotes })
            await pendingVoiceNoteRepo.deleteBySessionId(body.voiceNoteSessionId)
          }
        }

        // 4. Create intake event
        await repo.createIntakeEvent({
          asset_id: asset.id,
          operator_name: operatorName ?? null,
          gps_lat: body.gpsLat ?? null,
          gps_lon: body.gpsLon ?? null,
          ai_analysis_result: body.aiAnalysisResult ?? null,
          vin_lookup_result: body.vinLookupResult ?? null,
          ai_taxonomy_result: body.aiTaxonomyResult ?? null,
          source_photos: storedPhotos.map((p) => ({ url: p.url, label: p.label })),
        })

        // 5. Auto-flag for review if quality thresholds not met
        const confidence = (body.aiTaxonomyResult as Record<string, unknown> | null)
          ?.taxonomy as Record<string, unknown> | undefined
        const confidenceScore = typeof confidence?.confidence === 'number'
          ? confidence.confidence
          : null

        const needsReview =
          (confidenceScore !== null && confidenceScore < 0.70) ||
          !body.coreSpecs?.make ||
          !body.coreSpecs?.model ||
          !body.coreSpecs?.year

        if (needsReview) {
          await repo.update(asset.id, { status: 'needs_review' })
        }

        const finalAsset = needsReview
          ? { ...updatedAsset, status: 'needs_review' }
          : updatedAsset
        return reply.status(201).send({ asset: finalAsset })
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return reply.status(500).send({ error: message })
      }
    }
  )

  // GET /api/assets
  fastify.get<{ Querystring: ListQuery }>(
    '/api/assets',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            category: { type: 'string' },
            type: { type: 'string' },
            make: { type: 'string' },
            status: { type: 'string' },
            search: { type: 'string' },
            limit: { type: 'integer' },
            offset: { type: 'integer' },
            userId: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
    try {
      const { category, type, make, status, search, limit, offset, userId } = request.query
      const result = await repo.list({
        category,
        type,
        make,
        status,
        search,
        limit: limit !== undefined ? Number(limit) : 20,
        offset: offset !== undefined ? Number(offset) : 0,
        userId,
      })
      return reply.send(result)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return reply.status(500).send({ error: message })
    }
  })

  // GET /api/assets/:id
  fastify.get<{ Params: IdParams }>('/api/assets/:id', async (request, reply) => {
    try {
      const asset = await repo.findById(request.params.id)
      return reply.send(asset)
    } catch (error: unknown) {
      const err = error as Error
      if (err instanceof NotFoundError) {
        return reply.status(404).send({ error: err.message })
      }
      return reply.status(500).send({ error: err.message })
    }
  })

  // PUT /api/assets/:id
  fastify.put<{ Params: IdParams; Body: Record<string, unknown> }>(
    '/api/assets/:id',
    async (request, reply) => {
      try {
        const asset = await repo.update(request.params.id, request.body as Parameters<typeof repo.update>[1])
        return reply.send(asset)
      } catch (error: unknown) {
        const err = error as Error
        if (err instanceof NotFoundError) {
          return reply.status(404).send({ error: err.message })
        }
        return reply.status(500).send({ error: err.message })
      }
    }
  )

  // GET /api/assets/:id/intake-events
  fastify.get<{ Params: IdParams }>('/api/assets/:id/intake-events', async (request, reply) => {
    try {
      const events = await repo.findIntakeEventsByAssetId(request.params.id)
      return reply.send({ events })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return reply.status(500).send({ error: message })
    }
  })
}
