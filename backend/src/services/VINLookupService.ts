import Anthropic from '@anthropic-ai/sdk'
import axios from 'axios'

export interface VinResult {
  make: string | null
  model: string | null
  year: number | null
  engineType: string | null
  transmission: string | null
  gvwLbs: number | null
  source: 'nhtsa' | 'claude'
}

interface NhtsaVariable {
  Variable: string
  Value: string | null
}

interface NhtsaResponse {
  Results: NhtsaVariable[]
}

function parseGvwr(value: string | null | undefined): number | null {
  if (!value) return null
  // e.g. "Class 3: 10,001 - 14,000 lb"
  const match = value.replace(/,/g, '').match(/(\d+)/)
  if (!match) return null
  return parseInt(match[1], 10)
}

export class VINLookupService {
  constructor(private readonly anthropic: Anthropic) {}

  async lookupVin(vin: string): Promise<VinResult> {
    try {
      const url = `https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${vin}?format=json`
      const response = await axios.get<NhtsaResponse>(url)
      const results = response.data.Results

      const get = (variable: string): string | null => {
        const entry = results.find((r) => r.Variable === variable)
        return entry?.Value ?? null
      }

      const make = get('Make')
      if (make && make.trim() !== '') {
        const yearStr = get('Model Year')
        const year = yearStr ? parseInt(yearStr, 10) : null
        return {
          make,
          model: get('Model'),
          year: isNaN(year as number) ? null : year,
          engineType: get('Fuel Type - Primary'),
          transmission: get('Transmission Style'),
          gvwLbs: parseGvwr(get('Gross Vehicle Weight Rating From')),
          source: 'nhtsa',
        }
      }
    } catch {
      // fall through to Claude fallback
    }

    // Claude fallback
    const message = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: `Given the VIN/serial number "${vin}", identify this heavy equipment. Return ONLY a JSON object: { "make": string|null, "model": string|null, "year": number|null, "engineType": string|null, "transmission": string|null, "gvwLbs": number|null }`,
        },
      ],
    })

    const textContent = message.content.find((block) => block.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      throw new Error('Claude returned no text content')
    }

    const match = textContent.text.match(/\{[\s\S]*\}/)
    if (!match) {
      throw new Error('Claude response contained no JSON object')
    }

    const parsed = JSON.parse(match[0]) as Omit<VinResult, 'source'>
    return {
      make: parsed.make ?? null,
      model: parsed.model ?? null,
      year: parsed.year ?? null,
      engineType: parsed.engineType ?? null,
      transmission: parsed.transmission ?? null,
      gvwLbs: parsed.gvwLbs ?? null,
      source: 'claude',
    }
  }
}
