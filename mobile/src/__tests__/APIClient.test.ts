import axios from 'axios'
import { APIClient } from '../services/APIClient'

jest.mock('axios')

describe('APIClient', () => {
  describe('analyzeImages', () => {
    it('posts to /api/analyze/images and returns AnalysisResult', async () => {
      const mockResponse = {
        data: {
          coreSpecs: {
            make: 'Caterpillar',
            model: '320',
            year: 2018,
            engineType: null,
            transmission: null,
            gvwLbs: null,
            hoursOnMeter: null,
          },
          typeSpecificSpecs: {},
          confidenceScore: 0.9,
        },
      }

      const mockPost = jest.fn().mockResolvedValue(mockResponse)
      ;(axios.create as jest.Mock).mockReturnValue({ post: mockPost })

      const client = new APIClient()
      const result = await client.analyzeImages({
        photos: [{ base64: 'abc', type: 'detail' }],
        taxonomy: { category: 'Heavy Equipment', type: 'Excavator', subtype: null },
      })

      expect(result.coreSpecs.make).toBe('Caterpillar')
      expect(result.confidenceScore).toBe(0.9)
    })

    it('throws ServiceError on failure', async () => {
      const mockPost = jest.fn().mockRejectedValue({
        response: { data: { error: 'Claude unavailable' } },
        message: 'Request failed',
      })
      ;(axios.create as jest.Mock).mockReturnValue({ post: mockPost })

      const client = new APIClient()
      await expect(
        client.analyzeImages({ photos: [] })
      ).rejects.toMatchObject({
        source: 'backend',
        message: 'Claude unavailable',
      })
    })
  })

  describe('analyzeVin', () => {
    it('posts to /api/analyze/vin and returns VinResult', async () => {
      const mockPost = jest.fn().mockResolvedValue({
        data: {
          make: 'John Deere',
          model: '310L',
          year: 2020,
          engineType: null,
          transmission: null,
          gvwLbs: null,
          source: 'nhtsa',
        }
      })
      ;(axios.create as jest.Mock).mockReturnValue({ post: mockPost })

      const client = new APIClient()
      const result = await client.analyzeVin({ vin: '1FT8W3DT5KEE12345' })

      expect(result.make).toBe('John Deere')
      expect(result.source).toBe('nhtsa')
    })

    it('throws ServiceError on failure', async () => {
      const mockPost = jest.fn().mockRejectedValue({
        response: { data: { error: 'NHTSA unavailable' } },
        message: 'Request failed',
      })
      ;(axios.create as jest.Mock).mockReturnValue({ post: mockPost })

      const client = new APIClient()
      await expect(client.analyzeVin({ vin: 'INVALID' })).rejects.toMatchObject({
        source: 'backend',
        message: 'NHTSA unavailable',
      })
    })
  })

  describe('classifyEquipment', () => {
    it('posts to /api/analyze/classify and returns ClassificationResult', async () => {
      const mockPost = jest.fn().mockResolvedValue({
        data: {
          taxonomy: {
            category: 'Heavy Equipment',
            type: 'Excavator',
            subtype: null,
            confidence: 0.95,
          },
          photoChecklist: ['left side', 'right side', 'engine compartment'],
        },
      })
      ;(axios.create as jest.Mock).mockReturnValue({ post: mockPost })

      const client = new APIClient()
      const result = await client.classifyEquipment([{ base64: 'abc' }], null)

      expect(result.taxonomy.category).toBe('Heavy Equipment')
      expect(result.taxonomy.type).toBe('Excavator')
      expect(result.photoChecklist).toHaveLength(3)
    })

    it('throws ServiceError on failure', async () => {
      const mockPost = jest.fn().mockRejectedValue({
        response: { data: { error: 'Classification failed' } },
        message: 'Request failed',
      })
      ;(axios.create as jest.Mock).mockReturnValue({ post: mockPost })

      const client = new APIClient()
      await expect(
        client.classifyEquipment([{ base64: 'abc' }])
      ).rejects.toMatchObject({
        source: 'backend',
        message: 'Classification failed',
      })
    })
  })

  describe('createAsset', () => {
    it('posts to /api/assets and returns asset', async () => {
      const mockAsset = {
        id: 'asset-123',
        created_at: '2026-04-02T00:00:00Z',
        updated_at: '2026-04-02T00:00:00Z',
        vin_serial: null,
        category: 'Heavy Equipment',
        type: 'Excavator',
        subtype: null,
        make: 'Caterpillar',
        model: '320',
        year: 2018,
        engine_type: null,
        transmission: null,
        gvw_lbs: null,
        hours_on_meter: null,
        type_specific_specs: {},
        lot_number: null,
        yard_location: null,
        consignor: null,
        photos: [],
        status: 'pending',
      }
      const mockPost = jest.fn().mockResolvedValue({ data: { asset: mockAsset } })
      ;(axios.create as jest.Mock).mockReturnValue({ post: mockPost })

      const client = new APIClient()
      const result = await client.createAsset({
        photos: [{ base64: 'abc', label: 'front', type: 'guided' }],
      })

      expect(result.asset.id).toBe('asset-123')
      expect(result.asset.make).toBe('Caterpillar')
    })

    it('throws ServiceError on failure', async () => {
      const mockPost = jest.fn().mockRejectedValue({
        response: { data: { error: 'Validation error' } },
        message: 'Request failed',
      })
      ;(axios.create as jest.Mock).mockReturnValue({ post: mockPost })

      const client = new APIClient()
      await expect(
        client.createAsset({ photos: [] })
      ).rejects.toMatchObject({
        source: 'backend',
        message: 'Validation error',
      })
    })
  })

  describe('listAssets', () => {
    it('gets /api/assets and returns AssetListResponse', async () => {
      const mockGet = jest.fn().mockResolvedValue({
        data: {
          data: [{ id: 'asset-1', make: 'Caterpillar', status: 'pending' }],
          total: 1,
        },
      })
      ;(axios.create as jest.Mock).mockReturnValue({ get: mockGet })

      const client = new APIClient()
      const result = await client.listAssets({ category: 'Heavy Equipment' })

      expect(result.total).toBe(1)
      expect(result.data).toHaveLength(1)
      expect(result.data[0].id).toBe('asset-1')
    })

    it('throws ServiceError on failure', async () => {
      const mockGet = jest.fn().mockRejectedValue({
        response: { data: { error: 'Database error' } },
        message: 'Request failed',
      })
      ;(axios.create as jest.Mock).mockReturnValue({ get: mockGet })

      const client = new APIClient()
      await expect(client.listAssets()).rejects.toMatchObject({
        source: 'backend',
        message: 'Database error',
      })
    })
  })

  describe('getTaxonomy', () => {
    it('gets /api/taxonomy and returns TaxonomyCategoryNode array', async () => {
      const mockGet = jest.fn().mockResolvedValue({
        data: [
          {
            category: 'Heavy Equipment',
            types: [
              { type: 'Excavator', subtypes: ['Mini', 'Standard', 'Large'] },
            ],
          },
        ],
      })
      ;(axios.create as jest.Mock).mockReturnValue({ get: mockGet })

      const client = new APIClient()
      const result = await client.getTaxonomy()

      expect(result).toHaveLength(1)
      expect(result[0].category).toBe('Heavy Equipment')
      expect(result[0].types[0].subtypes).toContain('Mini')
    })

    it('throws ServiceError on failure', async () => {
      const mockGet = jest.fn().mockRejectedValue({
        response: { data: { error: 'Taxonomy unavailable' } },
        message: 'Request failed',
      })
      ;(axios.create as jest.Mock).mockReturnValue({ get: mockGet })

      const client = new APIClient()
      await expect(client.getTaxonomy()).rejects.toMatchObject({
        source: 'backend',
        message: 'Taxonomy unavailable',
      })
    })
  })
})
