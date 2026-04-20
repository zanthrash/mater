import * as FileSystem from 'expo-file-system/legacy'
import Constants from 'expo-constants'

const API_BASE_URL = Constants.expoConfig?.extra?.apiBaseUrl ?? 'http://localhost:3000'

export interface PendingVoiceNote {
  id: string
  tempPath: string
  publicUrl: string
  durationSeconds: number
  transcript: string | null
  transcriptionStatus: 'pending' | 'done' | 'failed'
}

export class VoiceNoteUploader {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  async upload(sessionId: string, fileUri: string, durationSeconds: number): Promise<PendingVoiceNote> {
    const result = await FileSystem.uploadAsync(
      `${this.baseUrl}/api/voice-notes/upload`,
      fileUri,
      {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: 'audio',
        mimeType: 'audio/mp4',
        parameters: {
          sessionId,
          durationSeconds: String(durationSeconds),
        },
      }
    )

    if (result.status < 200 || result.status >= 300) {
      throw new Error(`Upload failed with status ${result.status}`)
    }

    const body = JSON.parse(result.body) as { id: string; tempPath: string; publicUrl: string }
    return {
      id: body.id,
      tempPath: body.tempPath,
      publicUrl: body.publicUrl,
      durationSeconds,
      transcript: null,
      transcriptionStatus: 'pending',
    }
  }

  async pollTranscription(sessionId: string): Promise<PendingVoiceNote[]> {
    const res = await fetch(`${this.baseUrl}/api/voice-notes/session/${sessionId}`)
    const json = await res.json() as { notes: Array<{
      id: string
      temp_path: string
      public_url: string
      duration_seconds: number
      transcript: string | null
      transcription_status: string
    }> }
    return json.notes.map((n) => ({
      id: n.id,
      tempPath: n.temp_path,
      publicUrl: n.public_url,
      durationSeconds: n.duration_seconds,
      transcript: n.transcript,
      transcriptionStatus: n.transcription_status as PendingVoiceNote['transcriptionStatus'],
    }))
  }

  async deleteNote(id: string): Promise<void> {
    await fetch(`${this.baseUrl}/api/voice-notes/${id}`, { method: 'DELETE' })
  }
}
