import OpenAI from 'openai'
import { toFile } from 'openai/uploads'

export class TranscriptionService {
  constructor(private readonly openai: OpenAI) {}

  async transcribe(audioBuffer: Buffer): Promise<string> {
    const file = await toFile(audioBuffer, 'audio.m4a', { type: 'audio/mp4' })

    const result = await this.openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language: 'en',
      prompt: 'Heavy equipment inspection. Technical terms: CAT, Komatsu, Deere, hydraulic, undercarriage, serial number, hours, engine, transmission.',
    })

    return result.text.trim()
  }
}
