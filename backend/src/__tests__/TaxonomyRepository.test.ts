import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TaxonomyRepository } from '../repositories/TaxonomyRepository.js'

// For getAll chain: from('taxonomy').select('*').order('category', ...)
const mockOrder = vi.fn()
const mockSelect = vi.fn(() => ({ order: mockOrder }))
const mockFrom = vi.fn(() => ({ select: mockSelect }))
const mockSupabase = { from: mockFrom } as any

describe('TaxonomyRepository', () => {
  let repo: TaxonomyRepository

  beforeEach(() => {
    vi.clearAllMocks()
    repo = new TaxonomyRepository(mockSupabase)
  })

  describe('getAll()', () => {
    it('happy path: returns array of TaxonomyEntry objects with correct shape', async () => {
      const entries = [
        { id: '1', category: 'Equipment', type: 'Excavator', subtype: 'Mini' },
        { id: '2', category: 'Equipment', type: 'Excavator', subtype: 'Standard' },
        { id: '3', category: 'Attachment', type: 'Bucket', subtype: null },
      ]
      mockOrder.mockResolvedValueOnce({ data: entries, error: null })

      const result = await repo.getAll()

      expect(result).toEqual(entries)
      expect(mockFrom).toHaveBeenCalledWith('taxonomy')
      expect(mockSelect).toHaveBeenCalledWith('*')
      expect(mockOrder).toHaveBeenCalledWith('category', expect.anything())
    })

    it('throws on Supabase error', async () => {
      mockOrder.mockResolvedValueOnce({ data: null, error: { message: 'query failed' } })

      await expect(repo.getAll()).rejects.toThrow('Failed to fetch taxonomy: query failed')
    })
  })

  describe('getTree()', () => {
    it('happy path: converts flat entries into correct nested structure', async () => {
      const entries = [
        { id: '1', category: 'Equipment', type: 'Excavator', subtype: 'Mini' },
        { id: '2', category: 'Equipment', type: 'Excavator', subtype: 'Standard' },
        { id: '3', category: 'Equipment', type: 'Loader', subtype: 'Wheel' },
        { id: '4', category: 'Attachment', type: 'Bucket', subtype: 'Rock' },
        { id: '5', category: 'Attachment', type: 'Bucket', subtype: 'Dirt' },
        { id: '6', category: 'Attachment', type: 'Hammer', subtype: null },
      ]
      mockOrder.mockResolvedValueOnce({ data: entries, error: null })

      const result = await repo.getTree()

      expect(result).toHaveLength(2)

      const equipment = result.find(c => c.category === 'Equipment')
      expect(equipment).toBeDefined()
      expect(equipment!.types).toHaveLength(2)

      const excavator = equipment!.types.find(t => t.type === 'Excavator')
      expect(excavator).toBeDefined()
      expect(excavator!.subtypes).toEqual(['Mini', 'Standard'])

      const loader = equipment!.types.find(t => t.type === 'Loader')
      expect(loader).toBeDefined()
      expect(loader!.subtypes).toEqual(['Wheel'])

      const attachment = result.find(c => c.category === 'Attachment')
      expect(attachment).toBeDefined()
      expect(attachment!.types).toHaveLength(2)

      const bucket = attachment!.types.find(t => t.type === 'Bucket')
      expect(bucket).toBeDefined()
      expect(bucket!.subtypes).toEqual(['Rock', 'Dirt'])

      const hammer = attachment!.types.find(t => t.type === 'Hammer')
      expect(hammer).toBeDefined()
      // null subtype is excluded
      expect(hammer!.subtypes).toEqual([])
    })

    it('returns empty array when data is empty', async () => {
      mockOrder.mockResolvedValueOnce({ data: [], error: null })

      const result = await repo.getTree()

      expect(result).toEqual([])
    })
  })
})
