import { describe, it, expect, vi } from 'vitest'
import { ImageAnalysisService } from '../services/ImageAnalysisService.js'
import type { ImageInput, AnalysisResult, ClassificationResult } from '../services/ImageAnalysisService.js'

const sampleAnalysisResult: AnalysisResult = {
  coreSpecs: {
    make: 'Caterpillar',
    model: '336',
    year: 2019,
    engineType: 'Diesel',
    transmission: 'Automatic',
    gvwLbs: 180000,
    hoursOnMeter: 4500,
  },
  typeSpecificSpecs: {
    bucketCapacity: '1.2 cu yd',
    boomReach: '24 ft',
  },
  confidenceScore: 0.85,
}

const sampleClassificationResult: ClassificationResult = {
  taxonomy: {
    category: 'Earthmoving',
    type: 'Excavator',
    subtype: 'Standard',
    confidence: 0.92,
  },
  photoChecklist: [
    'Front',
    'Rear',
    'Left Side',
    'Right Side',
    'Engine Compartment',
    'Operator Station',
    'Attachment',
    'Serial Plate',
  ],
}

function makeAnthropicMock(responseText: string) {
  const create = vi.fn().mockResolvedValue({
    content: [{ type: 'text', text: responseText }],
    usage: { input_tokens: 100, output_tokens: 50 },
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

  describe('analyzeImages', () => {
    it('returns parsed AnalysisResult on successful response', async () => {
      const responseText = `Here is my analysis:\n${JSON.stringify(sampleAnalysisResult)}`
      const anthropic = makeAnthropicMock(responseText)
      const service = new ImageAnalysisService(anthropic as any)

      const { result } = await service.analyzeImages(images, null)

      expect(result.coreSpecs.make).toBe('Caterpillar')
      expect(result.coreSpecs.model).toBe('336')
      expect(result.coreSpecs.year).toBe(2019)
      expect(result.coreSpecs.engineType).toBe('Diesel')
      expect(result.coreSpecs.transmission).toBe('Automatic')
      expect(result.coreSpecs.gvwLbs).toBe(180000)
      expect(result.coreSpecs.hoursOnMeter).toBe(4500)
      expect(result.typeSpecificSpecs).toEqual({ bucketCapacity: '1.2 cu yd', boomReach: '24 ft' })
      expect(result.confidenceScore).toBe(0.85)
    })

    it('returns NULL_ANALYSIS_RESULT when JSON parse fails', async () => {
      const responseText = 'I cannot determine the equipment details from these images.'
      const anthropic = makeAnthropicMock(responseText)
      const service = new ImageAnalysisService(anthropic as any)

      const { result } = await service.analyzeImages(images, null)

      expect(result.coreSpecs.make).toBeNull()
      expect(result.coreSpecs.model).toBeNull()
      expect(result.coreSpecs.year).toBeNull()
      expect(result.coreSpecs.engineType).toBeNull()
      expect(result.coreSpecs.transmission).toBeNull()
      expect(result.coreSpecs.gvwLbs).toBeNull()
      expect(result.coreSpecs.hoursOnMeter).toBeNull()
      expect(result.typeSpecificSpecs).toEqual({})
      expect(result.confidenceScore).toBe(0)
    })

    it('rethrows error when Anthropic call fails', async () => {
      const create = vi.fn().mockRejectedValue(new Error('API rate limit exceeded'))
      const anthropic = { messages: { create } }
      const service = new ImageAnalysisService(anthropic as any)

      await expect(service.analyzeImages(images, null)).rejects.toThrow('API rate limit exceeded')
    })

    it('includes taxonomy context in prompt when provided', async () => {
      const responseText = JSON.stringify(sampleAnalysisResult)
      const anthropic = makeAnthropicMock(responseText)
      const service = new ImageAnalysisService(anthropic as any)

      await service.analyzeImages(images, { category: 'Earthmoving', type: 'Excavator', subtype: 'Mini' })

      const callArgs = anthropic._mocks.create.mock.calls[0][0]
      const userContent = callArgs.messages[0].content
      const textBlock = userContent.find((b: any) => b.type === 'text')
      expect(textBlock.text).toContain('Earthmoving > Excavator > Mini')
    })

    it('omits taxonomy prefix when taxonomy is null', async () => {
      const responseText = JSON.stringify(sampleAnalysisResult)
      const anthropic = makeAnthropicMock(responseText)
      const service = new ImageAnalysisService(anthropic as any)

      await service.analyzeImages(images, null)

      const callArgs = anthropic._mocks.create.mock.calls[0][0]
      const userContent = callArgs.messages[0].content
      const textBlock = userContent.find((b: any) => b.type === 'text')
      expect(textBlock.text).not.toContain('This is a')
    })
  })

  describe('classifyEquipment', () => {
    it('returns parsed ClassificationResult on successful response', async () => {
      const responseText = `Here is the classification:\n${JSON.stringify(sampleClassificationResult)}`
      const anthropic = makeAnthropicMock(responseText)
      const service = new ImageAnalysisService(anthropic as any)

      const { result } = await service.classifyEquipment(images, null)

      expect(result.taxonomy.category).toBe('Earthmoving')
      expect(result.taxonomy.type).toBe('Excavator')
      expect(result.taxonomy.subtype).toBe('Standard')
      expect(result.taxonomy.confidence).toBe(0.92)
      expect(result.photoChecklist).toContain('Front')
      expect(result.photoChecklist).toContain('Serial Plate')
      expect(result.photoChecklist.length).toBe(8)
    })

    it('returns NULL_CLASSIFICATION when JSON parse fails', async () => {
      const responseText = 'I cannot classify this equipment.'
      const anthropic = makeAnthropicMock(responseText)
      const service = new ImageAnalysisService(anthropic as any)

      const { result } = await service.classifyEquipment(images, null)

      expect(result.taxonomy.category).toBe('Unknown')
      expect(result.taxonomy.type).toBe('Unknown')
      expect(result.taxonomy.subtype).toBeNull()
      expect(result.taxonomy.confidence).toBe(0)
      expect(result.photoChecklist).toEqual(['Front', 'Rear', 'Left Side', 'Right Side', 'Interior', 'Engine', 'Serial Plate'])
    })

    it('includes VIN/serial in prompt when provided', async () => {
      const responseText = JSON.stringify(sampleClassificationResult)
      const anthropic = makeAnthropicMock(responseText)
      const service = new ImageAnalysisService(anthropic as any)

      await service.classifyEquipment(images, 'CAT0336ABC123')

      const callArgs = anthropic._mocks.create.mock.calls[0][0]
      const userContent = callArgs.messages[0].content
      const textBlock = userContent.find((b: any) => b.type === 'text')
      expect(textBlock.text).toContain('VIN/Serial number provided: CAT0336ABC123')
    })

    it('omits VIN line when vinSerial is null', async () => {
      const responseText = JSON.stringify(sampleClassificationResult)
      const anthropic = makeAnthropicMock(responseText)
      const service = new ImageAnalysisService(anthropic as any)

      await service.classifyEquipment(images, null)

      const callArgs = anthropic._mocks.create.mock.calls[0][0]
      const userContent = callArgs.messages[0].content
      const textBlock = userContent.find((b: any) => b.type === 'text')
      expect(textBlock.text).not.toContain('VIN/Serial number provided')
    })

    it('rethrows error when Anthropic call fails', async () => {
      const create = vi.fn().mockRejectedValue(new Error('API timeout'))
      const anthropic = { messages: { create } }
      const service = new ImageAnalysisService(anthropic as any)

      await expect(service.classifyEquipment(images, null)).rejects.toThrow('API timeout')
    })
  })
})
