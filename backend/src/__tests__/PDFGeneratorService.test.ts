import { describe, it, expect } from 'vitest'
import { PDFGeneratorService } from '../services/PDFGeneratorService.js'

describe('PDFGeneratorService', () => {
  it('returns a non-empty Buffer', async () => {
    const service = new PDFGeneratorService()
    const result = await service.generate({
      id: 'test-id',
      created_at: '2026-01-01T00:00:00Z',
      inspector_name: 'Jane Smith',
      gps_lat: 40.7128,
      gps_lon: -74.0060,
      equipment_data: { make: 'Caterpillar', model: '320', year: 2018 },
      condition_data: { overall: 'Good', engine: { rating: 'Good', notes: 'Runs well' } },
      ai_image_result: null,
      vin_lookup_result: null,
      photos: [{ url: 'https://example.com/photo.jpg', type: 'overview' }],
    })
    expect(result).toBeInstanceOf(Buffer)
    expect(result.length).toBeGreaterThan(0)
  })

  it('includes inspector name in PDF content', async () => {
    const service = new PDFGeneratorService()
    const result = await service.generate({
      id: 'test-id-2',
      created_at: '2026-01-01T00:00:00Z',
      inspector_name: 'John Inspector',
      gps_lat: null,
      gps_lon: null,
      equipment_data: null,
      condition_data: null,
      ai_image_result: null,
      vin_lookup_result: null,
      photos: null,
    })
    expect(result).toBeInstanceOf(Buffer)
    expect(result.length).toBeGreaterThan(100)
  })
})
