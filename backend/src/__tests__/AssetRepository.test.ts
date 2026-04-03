import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AssetRepository, NotFoundError } from '../repositories/AssetRepository.js'

// For findById chain: from -> select -> eq -> single
const mockFindSingle = vi.fn()
const mockFindEq = vi.fn(() => ({ single: mockFindSingle }))
const mockFindSelect = vi.fn(() => ({ eq: mockFindEq }))

// For create chain: from -> insert -> select -> single
const mockCreateSingle = vi.fn()
const mockCreateSelect = vi.fn(() => ({ single: mockCreateSingle }))
const mockInsert = vi.fn(() => ({ select: mockCreateSelect }))

// For update chain: from -> update -> eq -> select -> single
const mockUpdateSingle = vi.fn()
const mockUpdateSelect = vi.fn(() => ({ single: mockUpdateSingle }))
const mockUpdateEq = vi.fn(() => ({ select: mockUpdateSelect }))
const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }))

// For list chain: from -> select (count) -> [optional filters] -> order -> range -> resolves
// We build a chainable query builder object
function makeListQueryBuilder(resolveValue: { data: unknown; error: unknown; count: number | null }) {
  const builder: Record<string, unknown> = {}
  const chain = () => builder
  builder.eq = vi.fn(chain)
  builder.or = vi.fn(chain)
  builder.order = vi.fn(chain)
  builder.range = vi.fn(() => Promise.resolve(resolveValue))
  return builder
}

let listQueryBuilder: ReturnType<typeof makeListQueryBuilder>

// For createIntakeEvent chain: from -> insert -> select -> single
const mockIntakeCreateSingle = vi.fn()
const mockIntakeCreateSelect = vi.fn(() => ({ single: mockIntakeCreateSingle }))
const mockIntakeInsert = vi.fn(() => ({ select: mockIntakeCreateSelect }))

// For findIntakeEventsByAssetId chain: from -> select -> eq -> order -> resolves
const mockIntakeFindOrder = vi.fn()
const mockIntakeFindEq = vi.fn(() => ({ order: mockIntakeFindOrder }))
const mockIntakeFindSelect = vi.fn(() => ({ eq: mockIntakeFindEq }))

const mockFrom = vi.fn((table: string) => {
  if (table === 'assets') {
    return {
      insert: mockInsert,
      select: (arg?: string, opts?: unknown) => {
        // list uses select('*', { count: 'exact' })
        if (opts && typeof opts === 'object' && (opts as Record<string, unknown>).count === 'exact') {
          return listQueryBuilder
        }
        return mockFindSelect(arg)
      },
      update: mockUpdate,
    }
  }
  if (table === 'intake_events') {
    return {
      insert: mockIntakeInsert,
      select: mockIntakeFindSelect,
    }
  }
  return {}
})
const mockSupabase = { from: mockFrom } as any

describe('AssetRepository', () => {
  let repo: AssetRepository

  beforeEach(() => {
    vi.clearAllMocks()
    repo = new AssetRepository(mockSupabase)
    listQueryBuilder = makeListQueryBuilder({ data: [], error: null, count: 0 })
  })

  describe('create', () => {
    it('happy path: returns record with id and timestamps', async () => {
      const expectedRecord = {
        id: 'asset-001',
        created_at: '2026-04-01T00:00:00.000Z',
        updated_at: '2026-04-01T00:00:00.000Z',
        vin_serial: '1HGCM82633A004352',
        category: 'heavy-equipment',
        type: 'excavator',
        subtype: null,
        make: 'Caterpillar',
        model: '320',
        year: 2018,
        engine_type: 'diesel',
        transmission: null,
        gvw_lbs: null,
        hours_on_meter: 1200,
        type_specific_specs: {},
        lot_number: 'LOT-001',
        yard_location: 'A1',
        consignor: 'ACME Corp',
        photos: [],
        status: 'available',
      }

      mockCreateSingle.mockResolvedValueOnce({ data: expectedRecord, error: null })

      const result = await repo.create({
        vin_serial: '1HGCM82633A004352',
        category: 'heavy-equipment',
        type: 'excavator',
        subtype: null,
        make: 'Caterpillar',
        model: '320',
        year: 2018,
        engine_type: 'diesel',
        transmission: null,
        gvw_lbs: null,
        hours_on_meter: 1200,
        type_specific_specs: {},
        lot_number: 'LOT-001',
        yard_location: 'A1',
        consignor: 'ACME Corp',
        photos: [],
        status: 'available',
      })

      expect(result).toEqual(expectedRecord)
      expect(result.id).toBe('asset-001')
      expect(result.created_at).toBe('2026-04-01T00:00:00.000Z')
      expect(result.updated_at).toBe('2026-04-01T00:00:00.000Z')
    })

    it('throws on supabase error', async () => {
      mockCreateSingle.mockResolvedValueOnce({ data: null, error: { message: 'insert failed' } })

      await expect(
        repo.create({
          vin_serial: null,
          category: null,
          type: null,
          subtype: null,
          make: null,
          model: null,
          year: null,
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
        })
      ).rejects.toThrow('Failed to create asset: insert failed')
    })
  })

  describe('findById', () => {
    it('happy path: returns expected asset shape', async () => {
      const expectedRecord = {
        id: 'asset-xyz',
        created_at: '2026-04-01T12:00:00.000Z',
        updated_at: '2026-04-01T12:00:00.000Z',
        vin_serial: null,
        category: 'truck',
        type: 'semi',
        subtype: null,
        make: 'Kenworth',
        model: 'T680',
        year: 2020,
        engine_type: 'diesel',
        transmission: 'automatic',
        gvw_lbs: 80000,
        hours_on_meter: null,
        type_specific_specs: { axles: 5 },
        lot_number: 'LOT-002',
        yard_location: 'B3',
        consignor: null,
        photos: [{ url: 'https://example.com/photo.jpg', label: 'front', type: 'exterior' }],
        status: 'available',
      }

      mockFindSingle.mockResolvedValueOnce({ data: expectedRecord, error: null })

      const result = await repo.findById('asset-xyz')

      expect(result).toEqual(expectedRecord)
      expect(result.id).toBe('asset-xyz')
      expect(result.make).toBe('Kenworth')
      expect(result.photos).toHaveLength(1)
    })

    it('throws NotFoundError on PGRST116', async () => {
      mockFindSingle.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'no rows returned' },
      })

      await expect(repo.findById('missing-id')).rejects.toThrow(NotFoundError)
      await expect(repo.findById('missing-id')).rejects.toThrow('Asset not found: missing-id')
    })

    it('throws database error for non-PGRST116 errors', async () => {
      mockFindSingle.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST500', message: 'connection refused' },
      })

      await expect(repo.findById('some-id')).rejects.toThrow('Database error: connection refused')
    })
  })

  describe('update', () => {
    it('happy path: returns updated record', async () => {
      const updatedRecord = {
        id: 'asset-001',
        created_at: '2026-04-01T00:00:00.000Z',
        updated_at: '2026-04-01T01:00:00.000Z',
        vin_serial: '1HGCM82633A004352',
        category: 'heavy-equipment',
        type: 'excavator',
        subtype: null,
        make: 'Caterpillar',
        model: '320',
        year: 2018,
        engine_type: 'diesel',
        transmission: null,
        gvw_lbs: null,
        hours_on_meter: 1500,
        type_specific_specs: {},
        lot_number: 'LOT-001',
        yard_location: 'A1',
        consignor: 'ACME Corp',
        photos: [],
        status: 'sold',
      }

      mockUpdateSingle.mockResolvedValueOnce({ data: updatedRecord, error: null })

      const result = await repo.update('asset-001', { status: 'sold', hours_on_meter: 1500 })

      expect(result).toEqual(updatedRecord)
      expect(result.status).toBe('sold')
      expect(result.hours_on_meter).toBe(1500)
      expect(mockUpdate).toHaveBeenCalledWith({ status: 'sold', hours_on_meter: 1500 })
      expect(mockUpdateEq).toHaveBeenCalledWith('id', 'asset-001')
    })

    it('throws on supabase error', async () => {
      mockUpdateSingle.mockResolvedValueOnce({ data: null, error: { message: 'update failed' } })

      await expect(repo.update('asset-001', { status: 'sold' })).rejects.toThrow(
        'Database error: update failed'
      )
    })
  })

  describe('list', () => {
    it('returns { data, total } with correct shape', async () => {
      const records = [
        {
          id: 'a1',
          created_at: '2026-04-01T00:00:00.000Z',
          updated_at: '2026-04-01T00:00:00.000Z',
          vin_serial: null,
          category: 'truck',
          type: null,
          subtype: null,
          make: 'Ford',
          model: 'F-250',
          year: 2021,
          engine_type: null,
          transmission: null,
          gvw_lbs: null,
          hours_on_meter: null,
          type_specific_specs: {},
          lot_number: null,
          yard_location: null,
          consignor: null,
          photos: [],
          status: 'available',
        },
      ]

      listQueryBuilder = makeListQueryBuilder({ data: records, error: null, count: 1 })

      const result = await repo.list({})

      expect(result).toEqual({ data: records, total: 1 })
      expect(result.data).toHaveLength(1)
      expect(result.total).toBe(1)
    })

    it('applies category filter', async () => {
      listQueryBuilder = makeListQueryBuilder({ data: [], error: null, count: 0 })

      await repo.list({ category: 'truck' })

      expect(listQueryBuilder.eq).toHaveBeenCalledWith('category', 'truck')
    })

    it('applies multiple filters', async () => {
      listQueryBuilder = makeListQueryBuilder({ data: [], error: null, count: 0 })

      await repo.list({ category: 'truck', make: 'Ford', status: 'available' })

      expect(listQueryBuilder.eq).toHaveBeenCalledWith('category', 'truck')
      expect(listQueryBuilder.eq).toHaveBeenCalledWith('make', 'Ford')
      expect(listQueryBuilder.eq).toHaveBeenCalledWith('status', 'available')
    })

    it('applies search filter', async () => {
      listQueryBuilder = makeListQueryBuilder({ data: [], error: null, count: 0 })

      await repo.list({ search: 'Caterpillar' })

      expect(listQueryBuilder.or).toHaveBeenCalledWith(
        'make.ilike.%Caterpillar%,model.ilike.%Caterpillar%,vin_serial.ilike.%Caterpillar%,lot_number.ilike.%Caterpillar%'
      )
    })

    it('uses default limit and offset', async () => {
      listQueryBuilder = makeListQueryBuilder({ data: [], error: null, count: 0 })

      await repo.list({})

      expect(listQueryBuilder.range).toHaveBeenCalledWith(0, 19)
    })

    it('respects custom limit and offset', async () => {
      listQueryBuilder = makeListQueryBuilder({ data: [], error: null, count: 0 })

      await repo.list({ limit: 10, offset: 20 })

      expect(listQueryBuilder.range).toHaveBeenCalledWith(20, 29)
    })

    it('throws on supabase error', async () => {
      listQueryBuilder = makeListQueryBuilder({ data: null, error: { message: 'query failed' }, count: null })

      await expect(repo.list({})).rejects.toThrow('Database error: query failed')
    })
  })

  describe('createIntakeEvent', () => {
    it('happy path: returns created intake event', async () => {
      const expectedEvent = {
        id: 'event-001',
        asset_id: 'asset-001',
        created_at: '2026-04-01T10:00:00.000Z',
        operator_name: 'Jane Doe',
        gps_lat: 37.7749,
        gps_lon: -122.4194,
        ai_analysis_result: { detected: ['excavator'] },
        vin_lookup_result: null,
        ai_taxonomy_result: null,
        source_photos: [{ url: 'https://example.com/photo.jpg', label: 'front' }],
      }

      mockIntakeCreateSingle.mockResolvedValueOnce({ data: expectedEvent, error: null })

      const result = await repo.createIntakeEvent({
        asset_id: 'asset-001',
        operator_name: 'Jane Doe',
        gps_lat: 37.7749,
        gps_lon: -122.4194,
        ai_analysis_result: { detected: ['excavator'] },
        vin_lookup_result: null,
        ai_taxonomy_result: null,
        source_photos: [{ url: 'https://example.com/photo.jpg', label: 'front' }],
      })

      expect(result).toEqual(expectedEvent)
      expect(result.id).toBe('event-001')
      expect(result.asset_id).toBe('asset-001')
    })

    it('throws on supabase error', async () => {
      mockIntakeCreateSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'intake insert failed' },
      })

      await expect(
        repo.createIntakeEvent({
          asset_id: 'asset-001',
          operator_name: null,
          gps_lat: null,
          gps_lon: null,
          ai_analysis_result: null,
          vin_lookup_result: null,
          ai_taxonomy_result: null,
          source_photos: null,
        })
      ).rejects.toThrow('Failed to create intake event: intake insert failed')
    })
  })

  describe('findIntakeEventsByAssetId', () => {
    it('returns array of intake events for asset', async () => {
      const events = [
        {
          id: 'event-002',
          asset_id: 'asset-abc',
          created_at: '2026-04-01T11:00:00.000Z',
          operator_name: 'John Smith',
          gps_lat: null,
          gps_lon: null,
          ai_analysis_result: null,
          vin_lookup_result: { vin: '1HGCM82633A004352' },
          ai_taxonomy_result: null,
          source_photos: null,
        },
        {
          id: 'event-003',
          asset_id: 'asset-abc',
          created_at: '2026-04-01T09:00:00.000Z',
          operator_name: 'Jane Doe',
          gps_lat: 37.7749,
          gps_lon: -122.4194,
          ai_analysis_result: null,
          vin_lookup_result: null,
          ai_taxonomy_result: null,
          source_photos: [],
        },
      ]

      mockIntakeFindOrder.mockResolvedValueOnce({ data: events, error: null })

      const result = await repo.findIntakeEventsByAssetId('asset-abc')

      expect(result).toEqual(events)
      expect(result).toHaveLength(2)
      expect(mockIntakeFindEq).toHaveBeenCalledWith('asset_id', 'asset-abc')
      expect(mockIntakeFindOrder).toHaveBeenCalledWith('created_at', { ascending: false })
    })

    it('returns empty array when no events found', async () => {
      mockIntakeFindOrder.mockResolvedValueOnce({ data: [], error: null })

      const result = await repo.findIntakeEventsByAssetId('asset-no-events')

      expect(result).toEqual([])
      expect(result).toHaveLength(0)
    })

    it('throws on supabase error', async () => {
      mockIntakeFindOrder.mockResolvedValueOnce({ data: null, error: { message: 'query failed' } })

      await expect(repo.findIntakeEventsByAssetId('asset-abc')).rejects.toThrow(
        'Database error: query failed'
      )
    })
  })
})
