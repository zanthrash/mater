import Anthropic from '@anthropic-ai/sdk'

export interface ImageInput {
  base64: string
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp'
}

export interface EquipmentAnalysis {
  make: string | null
  model: string | null
  year: number | null
  engineType: string | null
  transmission: string | null
  gvwLbs: number | null
  hoursOnMeter: number | null
  conditionSummary: string | null
  confidenceScore: number | null
}

const NULL_ANALYSIS: EquipmentAnalysis = {
  make: null,
  model: null,
  year: null,
  engineType: null,
  transmission: null,
  gvwLbs: null,
  hoursOnMeter: null,
  conditionSummary: null,
  confidenceScore: null,
}

export class ImageAnalysisService {
  constructor(private readonly anthropic: Anthropic) {}

  async analyzeImages(images: ImageInput[]): Promise<EquipmentAnalysis> {
    const imageBlocks: Anthropic.ImageBlockParam[] = images.map((image) => ({
      type: 'image',
      source: {
        type: 'base64',
        media_type: image.mediaType,
        data: image.base64,
      },
    }))

    const textBlock: Anthropic.TextBlockParam = {
      type: 'text',
      text: `Please analyze these equipment photos and return ONLY a JSON object with these fields:
{
  "make": string or null,
  "model": string or null,
  "year": number or null,
  "engineType": string or null,
  "transmission": string or null,
  "gvwLbs": number or null,
  "hoursOnMeter": number or null,
  "conditionSummary": string or null,
  "confidenceScore": number between 0 and 1 or null
}`,
    }

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: 'You are an expert heavy equipment inspector. Analyze the provided images and return a JSON object with equipment details.',
      messages: [
        {
          role: 'user',
          content: [...imageBlocks, textBlock],
        },
      ],
    })

    const textContent = response.content.find((block) => block.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      return { ...NULL_ANALYSIS }
    }

    try {
      const match = textContent.text.match(/\{[\s\S]*\}/)
      if (!match) {
        return { ...NULL_ANALYSIS }
      }
      const parsed = JSON.parse(match[0]) as EquipmentAnalysis
      return parsed
    } catch {
      return { ...NULL_ANALYSIS }
    }
  }

  async extractVinFromImage(base64Image: string): Promise<string> {
    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
      system: 'You are an expert at reading VIN (Vehicle Identification Number) and serial number plates from photos of vehicles and heavy equipment.',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: 'Extract the VIN (Vehicle Identification Number) or serial number visible in this image. Return ONLY the VIN/serial number string with no additional text. If no VIN or serial number is visible, return exactly "NO_VIN_FOUND".',
            },
          ],
        },
      ],
    })

    const textContent = response.content.find((block) => block.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      throw new VinExtractionError('No text response from API')
    }

    const vin = textContent.text.trim()
    if (vin === 'NO_VIN_FOUND' || vin.length === 0) {
      throw new VinExtractionError('No VIN found in image')
    }

    return vin
  }
}

export class VinExtractionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'VinExtractionError'
  }
}
