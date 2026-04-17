import type { FastifyPluginAsync } from 'fastify'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { config } from '../config.js'
import { VoiceNoteStorageService } from '../services/VoiceNoteStorageService.js'
import { TranscriptionService } from '../services/TranscriptionService.js'
import { PendingVoiceNoteRepository } from '../repositories/PendingVoiceNoteRepository.js'
import { AiUsageRepository } from '../repositories/AiUsageRepository.js'

interface IdParams {
  id: string
}

interface SessionParams {
  sessionId: string
}

export const voiceNotesRoute: FastifyPluginAsync = async (fastify) => {
  const supabase = createClient(config.supabaseUrl, config.supabaseKey)
  const storageService = new VoiceNoteStorageService(supabase)
  const anthropic = new Anthropic({ apiKey: config.anthropicApiKey })
  const usageRepo = new AiUsageRepository(supabase)
  const transcriptionService = new TranscriptionService(anthropic, usageRepo)
  const pendingRepo = new PendingVoiceNoteRepository(supabase)

  // POST /api/voice-notes/upload
  fastify.post('/api/voice-notes/upload', async (request, reply) => {
    try {
      const data = await request.file()
      if (!data) {
        return reply.status(400).send({ error: 'No file uploaded' })
      }

      const sessionId = (data.fields.sessionId as { value: string } | undefined)?.value
      const durationSeconds = parseInt(
        (data.fields.durationSeconds as { value: string } | undefined)?.value ?? '0',
        10
      )

      if (!sessionId) {
        return reply.status(400).send({ error: 'sessionId is required' })
      }

      const chunks: Buffer[] = []
      for await (const chunk of data.file) {
        chunks.push(chunk)
      }
      const audioBuffer = Buffer.concat(chunks)

      const { tempPath, publicUrl } = await storageService.uploadTemp(sessionId, audioBuffer, durationSeconds)

      const pending = await pendingRepo.create({
        session_id: sessionId,
        temp_path: tempPath,
        public_url: publicUrl,
        duration_seconds: durationSeconds,
        transcript: null,
        transcription_status: 'pending',
      })

      // Fire-and-forget transcription
      transcriptionService.transcribe(audioBuffer).then((transcript) => {
        pendingRepo.updateTranscript(pending.id, transcript, 'done').catch(() => {})
      }).catch(() => {
        pendingRepo.updateTranscript(pending.id, '', 'failed').catch(() => {})
      })

      return reply.status(201).send({ id: pending.id, tempPath, publicUrl })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return reply.status(500).send({ error: message })
    }
  })

  // GET /api/voice-notes/session/:sessionId
  fastify.get<{ Params: SessionParams }>('/api/voice-notes/session/:sessionId', async (request, reply) => {
    try {
      const notes = await pendingRepo.findBySessionId(request.params.sessionId)
      return reply.send({ notes })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return reply.status(500).send({ error: message })
    }
  })

  // DELETE /api/voice-notes/:id
  fastify.delete<{ Params: IdParams }>('/api/voice-notes/:id', async (request, reply) => {
    try {
      const { data: note } = await supabase
        .from('pending_voice_notes')
        .select('temp_path')
        .eq('id', request.params.id)
        .single()

      if (note?.temp_path) {
        await supabase.storage.from('voice-notes').remove([note.temp_path])
      }

      await pendingRepo.deleteById(request.params.id)
      return reply.status(204).send()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return reply.status(500).send({ error: message })
    }
  })
}
