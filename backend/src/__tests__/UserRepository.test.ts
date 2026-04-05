import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UserRepository } from '../repositories/UserRepository.js'

// For upsertByEmail chain: from -> upsert -> select -> single
const mockUpsertSingle = vi.fn()
const mockUpsertSelect = vi.fn(() => ({ single: mockUpsertSingle }))
const mockUpsert = vi.fn(() => ({ select: mockUpsertSelect }))

// For findById chain: from -> select -> eq -> single
const mockFindSingle = vi.fn()
const mockFindEq = vi.fn(() => ({ single: mockFindSingle }))
const mockFindSelect = vi.fn(() => ({ eq: mockFindEq }))

const mockFrom = vi.fn((table: string) => {
  if (table === 'users') {
    return {
      upsert: mockUpsert,
      select: mockFindSelect,
    }
  }
  return {}
})
const mockSupabase = { from: mockFrom } as any

describe('UserRepository', () => {
  let repo: UserRepository

  beforeEach(() => {
    vi.clearAllMocks()
    repo = new UserRepository(mockSupabase)
  })

  describe('upsertByEmail', () => {
    it('upserts a user and returns the record', async () => {
      const user = { id: 'u1', email: 'zach@test.com', display_name: 'zach', created_at: '2026-04-05' }
      mockUpsertSingle.mockResolvedValueOnce({ data: user, error: null })

      const result = await repo.upsertByEmail('zach@test.com')

      expect(mockFrom).toHaveBeenCalledWith('users')
      expect(mockUpsert).toHaveBeenCalledWith(
        { email: 'zach@test.com', display_name: 'zach' },
        { onConflict: 'email' }
      )
      expect(result).toEqual(user)
    })

    it('derives display_name from email prefix', async () => {
      const user = { id: 'u2', email: 'jane.doe@company.com', display_name: 'jane.doe', created_at: '2026-04-05' }
      mockUpsertSingle.mockResolvedValueOnce({ data: user, error: null })

      await repo.upsertByEmail('jane.doe@company.com')

      expect(mockUpsert).toHaveBeenCalledWith(
        { email: 'jane.doe@company.com', display_name: 'jane.doe' },
        { onConflict: 'email' }
      )
    })

    it('throws on supabase error', async () => {
      mockUpsertSingle.mockResolvedValueOnce({ data: null, error: { message: 'db error' } })

      await expect(repo.upsertByEmail('bad@test.com')).rejects.toThrow('db error')
    })
  })

  describe('findById', () => {
    it('returns user by id', async () => {
      const user = { id: 'u1', email: 'zach@test.com', display_name: 'zach', created_at: '2026-04-05' }
      mockFindSingle.mockResolvedValueOnce({ data: user, error: null })

      const result = await repo.findById('u1')

      expect(mockFrom).toHaveBeenCalledWith('users')
      expect(mockFindSelect).toHaveBeenCalledWith('*')
      expect(mockFindEq).toHaveBeenCalledWith('id', 'u1')
      expect(result).toEqual(user)
    })

    it('throws on supabase error', async () => {
      mockFindSingle.mockResolvedValueOnce({ data: null, error: { message: 'user not found' } })

      await expect(repo.findById('bad-id')).rejects.toThrow('user not found')
    })
  })
})
