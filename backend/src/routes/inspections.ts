import type { FastifyPluginAsync } from 'fastify'
import { createClient } from '@supabase/supabase-js'
import { config } from '../config.js'
import { InspectionRepository, NotFoundError } from '../repositories/InspectionRepository.js'
import { PhotoStorageService } from '../services/PhotoStorageService.js'
import { PDFGeneratorService } from '../services/PDFGeneratorService.js'

interface PostBody {
  inspectorName: string
  gpsLat?: number
  gpsLon?: number
  photos: Array<{ base64: string; type: string }>
  equipmentData: Record<string, unknown>
  conditionData?: Record<string, unknown>
  aiImageResult?: Record<string, unknown>
  vinLookupResult?: Record<string, unknown>
}

interface GetParams {
  id: string
}

export const inspectionsRoute: FastifyPluginAsync = async (fastify) => {
  const supabase = createClient(config.supabaseUrl, config.supabaseKey)
  const repo = new InspectionRepository(supabase)
  const photoService = new PhotoStorageService(supabase)
  const pdfService = new PDFGeneratorService()

  fastify.post<{ Body: PostBody }>(
    '/api/inspections',
    {
      bodyLimit: 10 * 1024 * 1024, // 10MB for base64-encoded photos
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['inspectorName', 'photos', 'equipmentData'],
          properties: {
            inspectorName: { type: 'string' },
            gpsLat: { type: 'number' },
            gpsLon: { type: 'number' },
            photos: {
              type: 'array',
              items: {
                type: 'object',
                required: ['base64', 'type'],
                additionalProperties: false,
                properties: {
                  base64: { type: 'string' },
                  type: { type: 'string' },
                },
              },
            },
            equipmentData: { type: 'object' },
            conditionData: { type: 'object' },
            aiImageResult: { type: 'object' },
            vinLookupResult: { type: 'object' },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const body = request.body

        // 1. Create initial inspection record
        const inspection = await repo.create({
          inspector_name: body.inspectorName,
          gps_lat: body.gpsLat ?? null,
          gps_lon: body.gpsLon ?? null,
          equipment_data: body.equipmentData,
          condition_data: body.conditionData ?? null,
          ai_image_result: body.aiImageResult ?? null,
          vin_lookup_result: body.vinLookupResult ?? null,
          pdf_url: null,
          photos: null,
        })

        // 2. Upload photos
        const storedPhotos = await photoService.uploadPhotos(inspection.id, body.photos)

        // 3. Generate PDF
        const pdfBuffer = await pdfService.generate({ ...inspection, photos: storedPhotos })

        // 4. Upload PDF to storage
        const pdfPath = `${inspection.id}/report.pdf`
        const { error: uploadError } = await supabase.storage
          .from('inspection-pdfs')
          .upload(pdfPath, pdfBuffer, { contentType: 'application/pdf' })

        if (uploadError) {
          throw new Error(`Failed to upload PDF: ${uploadError.message}`)
        }

        // 5. Get PDF public URL
        const { data: urlData } = supabase.storage
          .from('inspection-pdfs')
          .getPublicUrl(pdfPath)
        const pdfUrl = urlData.publicUrl

        // 6. Update inspection record with photos and PDF URL
        await repo.update(inspection.id, {
          photos: storedPhotos,
          pdf_url: pdfUrl,
        })

        // 7. Return result
        return reply.status(201).send({ inspectionId: inspection.id, pdfUrl })
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return reply.status(500).send({ error: message })
      }
    }
  )

  fastify.get<{ Params: GetParams }>('/api/inspections/:id', async (request, reply) => {
    try {
      const inspection = await repo.findById(request.params.id)
      return reply.send(inspection)
    } catch (error) {
      const err = error as Error
      if (err instanceof NotFoundError) {
        return reply.status(404).send({ error: err.message })
      }
      return reply.status(500).send({ error: err.message })
    }
  })
}
