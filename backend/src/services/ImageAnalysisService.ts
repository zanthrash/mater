import Anthropic from '@anthropic-ai/sdk'

export interface ImageInput {
  base64: string
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp'
}

export interface ClassificationResult {
  taxonomy: {
    category: string
    type: string
    subtype: string | null
    confidence: number
  }
  photoChecklist: string[]
}

export interface CoreSpecs {
  make: string | null
  model: string | null
  year: number | null
  engineType: string | null
  transmission: string | null
  gvwLbs: number | null
  hoursOnMeter: number | null
}

export interface AnalysisResult {
  coreSpecs: CoreSpecs
  typeSpecificSpecs: Record<string, string | number | null>
  confidenceScore: number
}

export interface TaxonomyContext {
  category: string
  type: string
  subtype?: string | null
}

const NULL_CLASSIFICATION: ClassificationResult = {
  taxonomy: {
    category: 'Unknown',
    type: 'Unknown',
    subtype: null,
    confidence: 0,
  },
  photoChecklist: ['Front', 'Rear', 'Left Side', 'Right Side', 'Interior', 'Engine', 'Serial Plate'],
}

const NULL_ANALYSIS_RESULT: AnalysisResult = {
  coreSpecs: {
    make: null,
    model: null,
    year: null,
    engineType: null,
    transmission: null,
    gvwLbs: null,
    hoursOnMeter: null,
  },
  typeSpecificSpecs: {},
  confidenceScore: 0,
}

export class ImageAnalysisService {
  constructor(private readonly anthropic: Anthropic) {}

  async classifyEquipment(images: ImageInput[], vinSerial: string | null): Promise<ClassificationResult> {
    const imageBlocks: Anthropic.ImageBlockParam[] = images.map((image) => ({
      type: 'image',
      source: {
        type: 'base64',
        media_type: image.mediaType,
        data: image.base64,
      },
    }))

    let promptText = `Please analyze this equipment image and return ONLY a JSON object:
{
  "taxonomy": {
    "category": string (e.g. "Earthmoving", "Lifting", "Trucking", "Aerial", "Compaction", "Agriculture", "Forestry", "Power Generation", "Paving", "Mining", "Marine/Dredging"),
    "type": string (e.g. "Excavator", "Wheel Loader", "Crane"),
    "subtype": string or null (e.g. "Mini", "Standard"),
    "confidence": number between 0 and 1
  },
  "photoChecklist": array of 5-10 strings describing key photos to capture for this equipment type (e.g. ["Front", "Rear", "Engine Compartment", "Operator Station", "Attachment", "Serial Plate"])
}`

    if (vinSerial) {
      promptText += `\nVIN/Serial number provided: ${vinSerial}\nUse this to help with classification.`
    }

    const textBlock: Anthropic.TextBlockParam = {
      type: 'text',
      text: promptText,
    }

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: 'You are an expert heavy equipment classifier. Analyze the provided image and return taxonomy classification and photo checklist as JSON.',
      messages: [
        {
          role: 'user',
          content: [...imageBlocks, textBlock],
        },
      ],
    })

    const textContent = response.content.find((block) => block.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      return { ...NULL_CLASSIFICATION }
    }

    try {
      const match = textContent.text.match(/\{[\s\S]*\}/)
      if (!match) {
        return { ...NULL_CLASSIFICATION }
      }
      const parsed = JSON.parse(match[0]) as ClassificationResult
      return parsed
    } catch {
      return { ...NULL_CLASSIFICATION }
    }
  }

  async analyzeImages(images: ImageInput[], taxonomy: TaxonomyContext | null): Promise<AnalysisResult> {
    const imageBlocks: Anthropic.ImageBlockParam[] = images.map((image) => ({
      type: 'image',
      source: {
        type: 'base64',
        media_type: image.mediaType,
        data: image.base64,
      },
    }))

    let promptText = ''

    if (taxonomy) {
      promptText += `This is a ${taxonomy.category} > ${taxonomy.type}${taxonomy.subtype ? ' > ' + taxonomy.subtype : ''}. Focus your analysis on specs relevant to this equipment type.\n\n`
    }

    promptText += `Please analyze these equipment photos and return ONLY a JSON object:
{
  "coreSpecs": {
    "make": string or null,
    "model": string or null,
    "year": number or null,
    "engineType": string or null,
    "transmission": string or null,
    "gvwLbs": number or null,
    "hoursOnMeter": number or null
  },
  "typeSpecificSpecs": object with dynamic key-value pairs specific to this equipment type (e.g. {"bucketCapacity": "1.2 cu yd", "boomReach": "24 ft"} for an excavator),
  "confidenceScore": number between 0 and 1
}`

    const textBlock: Anthropic.TextBlockParam = {
      type: 'text',
      text: promptText,
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
      return { ...NULL_ANALYSIS_RESULT }
    }

    try {
      const match = textContent.text.match(/\{[\s\S]*\}/)
      if (!match) {
        return { ...NULL_ANALYSIS_RESULT }
      }
      const parsed = JSON.parse(match[0]) as AnalysisResult
      return parsed
    } catch {
      return { ...NULL_ANALYSIS_RESULT }
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
