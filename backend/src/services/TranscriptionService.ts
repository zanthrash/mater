import Anthropic from '@anthropic-ai/sdk'
import { AiUsageRepository, calculateCostCents } from '../repositories/AiUsageRepository.js'

const MODEL = 'claude-sonnet-4-6'

export class TranscriptionService {
  constructor(
    private readonly anthropic: Anthropic,
    private readonly usageRepo: AiUsageRepository,
  ) {}

  async transcribe(audioBuffer: Buffer, assetId?: string): Promise<string> {
    const base64Audio = audioBuffer.toString('base64')

    const response = await this.anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: 'You are transcribing voice notes recorded by field workers during heavy equipment inspections. Transcribe the audio accurately, preserving technical terms, equipment names, and condition descriptions. Return only the transcription text with no additional commentary.',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'audio/mp4',
                data: base64Audio,
              },
            } as unknown as Anthropic.TextBlockParam,
            {
              type: 'text',
              text: 'Please transcribe this voice note.',
            },
          ],
        },
      ],
    })

    const { input_tokens, output_tokens } = response.usage

    await this.usageRepo.insertUsage({
      operation: 'transcribe',
      model: MODEL,
      input_tokens,
      output_tokens,
      cost_cents: calculateCostCents(input_tokens, output_tokens),
      asset_id: assetId,
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No transcription returned from Claude')
    }

    return textBlock.text.trim()
  }
}
