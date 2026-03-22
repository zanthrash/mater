import { describe, it, expect, vi, beforeEach } from 'vitest'
import { InspectionRepository } from '../repositories/InspectionRepository.js'

// For findById chain: from -> select -> eq -> single
const mockFindSingle = vi.fn()
const mockEq = vi.fn(() => ({ single: mockFindSingle }))
const mockFindSelect = vi.fn(() => ({ eq: mockEq }))

// For create chain: from -> insert -> select -> single
const mockCreateSingle = vi.fn()
const mockCreateSelect = vi.fn(() => ({ single: mockCreateSingle }))
const mockInsert = vi.fn(() => ({ select: mockCreateSelect }))

// For update chain: from -> update -> eq -> select -> single
const mockUpdateSingle = vi.fn()
const mockUpdateSelect = vi.fn(() => ({ single: mockUpdateSingle }))
const mockUpdateEq = vi.fn(() => ({ select: mockUpdateSelect }))
const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }))

const mockFrom = vi.fn((table: string) => ({
  insert: mockInsert,
  select: mockFindSelect,
  update: mockUpdate,
}))
const mockSupabase = { from: mockFrom } as any

describe('InspectionRepository', () => {
  let repo: InspectionRepository

  beforeEach(() => {
    vi.clearAllMocks()
    repo = new InspectionRepository(mockSupabase)
  })

  describe('create', () => {
    it('happy path: returns record with id and created_at', async () => {
      const expectedRecord = {
        id: 'abc-123',
        created_at: '2026-03-22T00:00:00.000Z',
        inspector_name: 'Jane Doe',
        gps_lat: 37.7749,
        gps_lon: -122.4194,
        equipment_data: { make: 'Caterpillar', model: '320' },
        condition_data: null,
        ai_image_result: null,
        vin_lookup_result: null,
        pdf_url: null,
        photos: null,
      }

      mockCreateSingle.mockResolvedValueOnce({ data: expectedRecord, error: null })

      const result = await repo.create({
        inspector_name: 'Jane Doe',
        gps_lat: 37.7749,
        gps_lon: -122.4194,
        equipment_data: { make: 'Caterpillar', model: '320' },
        condition_data: null,
        ai_image_result: null,
        vin_lookup_result: null,
        pdf_url: null,
        photos: null,
      })

      expect(result).toEqual(expectedRecord)
      expect(result.id).toBe('abc-123')
      expect(result.created_at).toBe('2026-03-22T00:00:00.000Z')
    })

    it('throws on supabase error', async () => {
      mockCreateSingle.mockResolvedValueOnce({ data: null, error: { message: 'insert failed' } })

      await expect(
        repo.create({
          inspector_name: null,
          gps_lat: null,
          gps_lon: null,
          equipment_data: null,
          condition_data: null,
          ai_image_result: null,
          vin_lookup_result: null,
          pdf_url: null,
          photos: null,
        })
      ).rejects.toThrow('Failed to create inspection: insert failed')
    })
  })

  describe('findById', () => {
    it('happy path: returns expected inspection shape', async () => {
      const expectedRecord = {
        id: 'xyz-789',
        created_at: '2026-03-22T12:00:00.000Z',
        inspector_name: 'John Smith',
        gps_lat: 40.7128,
        gps_lon: -74.006,
        equipment_data: { make: 'Komatsu', model: 'PC200' },
        condition_data: { overall: 'good' },
        ai_image_result: { detected: ['excavator'] },
        vin_lookup_result: { vin: '1HGCM82633A004352' },
        pdf_url: 'https://example.com/report.pdf',
        photos: [{ url: 'https://example.com/photo1.jpg', type: 'front' }],
      }

      mockFindSingle.mockResolvedValueOnce({ data: expectedRecord, error: null })

      const result = await repo.findById('xyz-789')

      expect(result).toEqual(expectedRecord)
      expect(result.id).toBe('xyz-789')
      expect(result.inspector_name).toBe('John Smith')
      expect(result.photos).toHaveLength(1)
    })

    it('not found: throws Error with PGRST116 code', async () => {
      mockFindSingle.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116', message: 'No rows found' } })

      await expect(repo.findById('nonexistent-id')).rejects.toThrow(
        'Inspection not found: nonexistent-id'
      )
    })

    it('throws database error for non-PGRST116 errors', async () => {
      mockFindSingle.mockResolvedValueOnce({ data: null, error: { code: 'PGRST500', message: 'connection refused' } })

      await expect(repo.findById('some-id')).rejects.toThrow(
        'Database error: connection refused'
      )
    })
  })

  describe('update', () => {
    it('happy path: returns updated record', async () => {
      const updatedRecord = {
        id: 'abc-123',
        created_at: '2026-03-22T00:00:00.000Z',
        inspector_name: 'Jane Doe',
        gps_lat: 37.7749,
        gps_lon: -122.4194,
        equipment_data: { make: 'Caterpillar', model: '320' },
        condition_data: null,
        ai_image_result: null,
        vin_lookup_result: null,
        pdf_url: 'https://example.com/report.pdf',
        photos: [{ url: 'https://example.com/photo.jpg', type: 'overview' }],
      }

      mockUpdateSingle.mockResolvedValueOnce({ data: updatedRecord, error: null })

      const result = await repo.update('abc-123', {
        pdf_url: 'https://example.com/report.pdf',
        photos: [{ url: 'https://example.com/photo.jpg', type: 'overview' }],
      })

      expect(result).toEqual(updatedRecord)
      expect(result.pdf_url).toBe('https://example.com/report.pdf')
      expect(result.photos).toHaveLength(1)
      expect(mockUpdate).toHaveBeenCalledWith({
        pdf_url: 'https://example.com/report.pdf',
        photos: [{ url: 'https://example.com/photo.jpg', type: 'overview' }],
      })
      expect(mockUpdateEq).toHaveBeenCalledWith('id', 'abc-123')
    })

    it('throws on supabase error', async () => {
      mockUpdateSingle.mockResolvedValueOnce({ data: null, error: { message: 'update failed' } })

      await expect(
        repo.update('abc-123', { pdf_url: 'https://example.com/report.pdf' })
      ).rejects.toThrow('Database error: update failed')
    })
  })
})
