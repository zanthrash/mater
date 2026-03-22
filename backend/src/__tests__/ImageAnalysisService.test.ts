import { describe, it, expect, vi } from 'vitest'
import { ImageAnalysisService } from '../services/ImageAnalysisService.js'
import type { ImageInput, EquipmentAnalysis } from '../services/ImageAnalysisService.js'

const sampleAnalysis: EquipmentAnalysis = {
  make: 'Caterpillar',
  model: '336',
  year: 2019,
  engineType: 'Diesel',
  transmission: 'Automatic',
  gvwLbs: 180000,
  hoursOnMeter: 4500,
  conditionSummary: 'Good condition with minor wear',
  confidenceScore: 0.85,
}

function makeAnthropicMock(responseText: string) {
  const create = vi.fn().mockResolvedValue({
    content: [{ type: 'text', text: responseText }],
  })
  return {
    messages: { create },
    _mocks: { create },
  }
}

describe('ImageAnalysisService', () => {
  const images: ImageInput[] = [
    { base64: Buffer.from('fake').toString('base64'), mediaType: 'image/jpeg' },
  ]

  it('returns parsed EquipmentAnalysis on successful response', async () => {
    const responseText = `Here is my analysis:\n${JSON.stringify(sampleAnalysis)}`
    const anthropic = makeAnthropicMock(responseText)
    const service = new ImageAnalysisService(anthropic as any)

    const result = await service.analyzeImages(images)

    expect(result.make).toBe('Caterpillar')
    expect(result.model).toBe('336')
    expect(result.year).toBe(2019)
    expect(result.engineType).toBe('Diesel')
    expect(result.transmission).toBe('Automatic')
    expect(result.gvwLbs).toBe(180000)
    expect(result.hoursOnMeter).toBe(4500)
    expect(result.conditionSummary).toBe('Good condition with minor wear')
    expect(result.confidenceScore).toBe(0.85)
  })

  it('returns all-null EquipmentAnalysis when JSON parse fails', async () => {
    const responseText = 'I cannot determine the equipment details from these images.'
    const anthropic = makeAnthropicMock(responseText)
    const service = new ImageAnalysisService(anthropic as any)

    const result = await service.analyzeImages(images)

    expect(result.make).toBeNull()
    expect(result.model).toBeNull()
    expect(result.year).toBeNull()
    expect(result.engineType).toBeNull()
    expect(result.transmission).toBeNull()
    expect(result.gvwLbs).toBeNull()
    expect(result.hoursOnMeter).toBeNull()
    expect(result.conditionSummary).toBeNull()
    expect(result.confidenceScore).toBeNull()
  })

  it('rethrows error when Anthropic call fails', async () => {
    const create = vi.fn().mockRejectedValue(new Error('API rate limit exceeded'))
    const anthropic = { messages: { create } }
    const service = new ImageAnalysisService(anthropic as any)

    await expect(service.analyzeImages(images)).rejects.toThrow('API rate limit exceeded')
  })
})
