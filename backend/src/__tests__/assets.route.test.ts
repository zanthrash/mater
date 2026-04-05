import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'
import { assetsRoute } from '../routes/assets.js'

const mockCreate = vi.fn()
const mockFindById = vi.fn()
const mockUpdate = vi.fn()
const mockList = vi.fn()
const mockCreateIntakeEvent = vi.fn()
const mockFindIntakeEvents = vi.fn()
const mockUploadPhotos = vi.fn()

vi.mock('../repositories/UserRepository.js', () => ({
  UserRepository: vi.fn(() => ({
    findById: vi.fn(),
  })),
}))

vi.mock('../repositories/AssetRepository.js', () => ({
  AssetRepository: vi.fn(() => ({
    create: mockCreate,
    findById: mockFindById,
    update: mockUpdate,
    list: mockList,
    createIntakeEvent: mockCreateIntakeEvent,
    findIntakeEventsByAssetId: mockFindIntakeEvents,
  })),
  NotFoundError: class NotFoundError extends Error {
    constructor(message: string) {
      super(message)
      this.name = 'NotFoundError'
    }
  },
}))

vi.mock('../services/PhotoStorageService.js', () => ({
  PhotoStorageService: vi.fn(() => ({
    uploadPhotos: mockUploadPhotos,
  })),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({})),
}))

function buildTestApp() {
  const app = Fastify()
  app.register(assetsRoute)
  return app
}

const sampleAsset = {
  id: 'asset-123',
  created_at: '2026-04-02T00:00:00Z',
  updated_at: '2026-04-02T00:00:00Z',
  vin_serial: null,
  category: 'truck',
  type: 'semi',
  subtype: null,
  make: 'Freightliner',
  model: 'Cascadia',
  year: 2020,
  engine_type: null,
  transmission: null,
  gvw_lbs: null,
  hours_on_meter: null,
  type_specific_specs: {},
  lot_number: null,
  yard_location: null,
  consignor: null,
  photos: [],
  status: 'intake',
  user_id: null,
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/assets', () => {
  it('returns 200 with data and total', async () => {
    mockList.mockResolvedValue({ data: [], total: 0 })

    const app = buildTestApp()
    const response = await app.inject({ method: 'GET', url: '/api/assets' })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ data: [], total: 0 })
    await app.close()
  })

  it('passes query params to list()', async () => {
    mockList.mockResolvedValue({ data: [sampleAsset], total: 1 })

    const app = buildTestApp()
    const response = await app.inject({
      method: 'GET',
      url: '/api/assets?category=truck&make=Freightliner&limit=10&offset=5',
    })

    expect(response.statusCode).toBe(200)
    expect(mockList).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'truck', make: 'Freightliner', limit: 10, offset: 5 })
    )
    await app.close()
  })
})

describe('GET /api/assets/:id', () => {
  it('returns 200 with asset data when found', async () => {
    mockFindById.mockResolvedValue(sampleAsset)

    const app = buildTestApp()
    const response = await app.inject({ method: 'GET', url: '/api/assets/asset-123' })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual(sampleAsset)
    await app.close()
  })

  it('returns 404 when NotFoundError is thrown', async () => {
    const { NotFoundError } = await import('../repositories/AssetRepository.js')
    mockFindById.mockRejectedValue(new NotFoundError('Asset not found: asset-999'))

    const app = buildTestApp()
    const response = await app.inject({ method: 'GET', url: '/api/assets/asset-999' })

    expect(response.statusCode).toBe(404)
    expect(response.json()).toEqual({ error: 'Asset not found: asset-999' })
    await app.close()
  })
})

describe('POST /api/assets', () => {
  it('returns 201 with asset after create, upload, update, and intake event', async () => {
    const assetWithoutPhotos = { ...sampleAsset, photos: [] }
    const updatedAsset = { ...sampleAsset, photos: [{ url: 'http://example.com/photo.jpg', label: 'front', type: 'guided' }] }

    mockCreate.mockResolvedValue(assetWithoutPhotos)
    mockUploadPhotos.mockResolvedValue([{ url: 'http://example.com/photo.jpg', type: 'front' }])
    mockUpdate.mockResolvedValue(updatedAsset)
    mockCreateIntakeEvent.mockResolvedValue({ id: 'event-1', asset_id: 'asset-123' })

    const app = buildTestApp()
    const response = await app.inject({
      method: 'POST',
      url: '/api/assets',
      payload: {
        photos: [{ base64: 'abc123', label: 'front', type: 'guided' }],
        operatorName: 'Jane Smith',
        taxonomy: { category: 'truck', type: 'semi' },
        coreSpecs: { make: 'Freightliner', model: 'Cascadia', year: 2020 },
      },
    })

    expect(response.statusCode).toBe(201)
    expect(response.json()).toEqual({ asset: updatedAsset })
    expect(mockCreate).toHaveBeenCalledOnce()
    expect(mockUploadPhotos).toHaveBeenCalledWith('asset-123', [{ base64: 'abc123', type: 'front' }])
    expect(mockUpdate).toHaveBeenCalledWith('asset-123', {
      photos: [{ url: 'http://example.com/photo.jpg', label: 'front', type: 'guided' }],
    })
    expect(mockCreateIntakeEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        asset_id: 'asset-123',
        operator_name: 'Jane Smith',
      })
    )
    await app.close()
  })
})

describe('PUT /api/assets/:id', () => {
  it('returns 200 with updated asset', async () => {
    const updatedAsset = { ...sampleAsset, make: 'Kenworth' }
    mockUpdate.mockResolvedValue(updatedAsset)

    const app = buildTestApp()
    const response = await app.inject({
      method: 'PUT',
      url: '/api/assets/asset-123',
      payload: { make: 'Kenworth' },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual(updatedAsset)
    expect(mockUpdate).toHaveBeenCalledWith('asset-123', { make: 'Kenworth' })
    await app.close()
  })
})

describe('GET /api/assets/:id/intake-events', () => {
  it('returns 200 with events array', async () => {
    mockFindIntakeEvents.mockResolvedValue([])

    const app = buildTestApp()
    const response = await app.inject({ method: 'GET', url: '/api/assets/asset-123/intake-events' })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ events: [] })
    expect(mockFindIntakeEvents).toHaveBeenCalledWith('asset-123')
    await app.close()
  })

  it('returns events when present', async () => {
    const events = [
      {
        id: 'event-1',
        asset_id: 'asset-123',
        created_at: '2026-04-02T00:00:00Z',
        operator_name: 'Jane Smith',
        gps_lat: null,
        gps_lon: null,
        ai_analysis_result: null,
        vin_lookup_result: null,
        ai_taxonomy_result: null,
        source_photos: null,
      },
    ]
    mockFindIntakeEvents.mockResolvedValue(events)

    const app = buildTestApp()
    const response = await app.inject({ method: 'GET', url: '/api/assets/asset-123/intake-events' })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ events })
    await app.close()
  })
})
