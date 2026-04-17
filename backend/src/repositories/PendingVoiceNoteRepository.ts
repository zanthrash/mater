import type { SupabaseClient } from '@supabase/supabase-js'

export interface PendingVoiceNote {
  id: string
  session_id: string
  temp_path: string
  public_url: string
  duration_seconds: number
  recorded_at: string
  transcript: string | null
  transcription_status: 'pending' | 'done' | 'failed'
}

export type CreatePendingVoiceNoteData = Omit<PendingVoiceNote, 'id' | 'recorded_at'>

export class PendingVoiceNoteRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async create(data: CreatePendingVoiceNoteData): Promise<PendingVoiceNote> {
    const { data: record, error } = await this.supabase
      .from('pending_voice_notes')
      .insert(data)
      .select()
      .single()

    if (error) throw new Error('Failed to create pending voice note: ' + error.message)
    return record as PendingVoiceNote
  }

  async findBySessionId(sessionId: string): Promise<PendingVoiceNote[]> {
    const { data: records, error } = await this.supabase
      .from('pending_voice_notes')
      .select('*')
      .eq('session_id', sessionId)
      .order('recorded_at', { ascending: true })

    if (error) throw new Error('Failed to fetch pending voice notes: ' + error.message)
    return (records ?? []) as PendingVoiceNote[]
  }

  async updateTranscript(id: string, transcript: string, status: 'done' | 'failed'): Promise<void> {
    const { error } = await this.supabase
      .from('pending_voice_notes')
      .update({ transcript, transcription_status: status })
      .eq('id', id)

    if (error) throw new Error('Failed to update transcript: ' + error.message)
  }

  async deleteBySessionId(sessionId: string): Promise<void> {
    const { error } = await this.supabase
      .from('pending_voice_notes')
      .delete()
      .eq('session_id', sessionId)

    if (error) throw new Error('Failed to delete pending voice notes: ' + error.message)
  }

  async deleteById(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('pending_voice_notes')
      .delete()
      .eq('id', id)

    if (error) throw new Error('Failed to delete pending voice note: ' + error.message)
  }
}
