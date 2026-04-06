import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DashboardRepository } from '../repositories/DashboardRepository.js'

function makeCountQuery(count: number) {
  const builder: Record<string, unknown> = {}
  const chain = () => builder
  builder.neq = vi.fn(chain)
  builder.eq = vi.fn(chain)
  builder.or = vi.fn(chain)
  builder.gte = vi.fn(chain)
  builder.lte = vi.fn(chain)
  builder.gt = vi.fn(chain)
  // head: true queries resolve with just count
  return { ...builder, then: (fn: (v: unknown) => void) => fn({ count, error: null }) }
}

function makeDataQuery(data: unknown[]) {
  const builder: Record<string, unknown> = {}
  const chain = () => builder
  builder.neq = vi.fn(chain)
  builder.eq = vi.fn(chain)
  builder.or = vi.fn(chain)
  builder.gte = vi.fn(chain)
  builder.lte = vi.fn(chain)
  builder.gt = vi.fn(chain)
  builder.order = vi.fn(chain)
  builder.limit = vi.fn(chain)
  builder.range = vi.fn(() => Promise.resolve({ data, error: null }))
  // Make it thenable for queries without range
  builder.then = (fn: (v: unknown) => void) => fn({ data, error: null })
  return builder
}

let countQueryResult: number
let dataQueryResult: unknown[]
let tableQueries: Map<string, { countResult?: number; dataResult?: unknown[] }>

const mockFrom = vi.fn((table: string) => {
  const config = tableQueries.get(table)
  return {
    select: (_sel?: string, opts?: Record<string, unknown>) => {
      if (opts?.head === true) {
        return makeCountQuery(config?.countResult ?? 0)
      }
      return makeDataQuery(config?.dataResult ?? [])
    },
  }
})

const mockSupabase = { from: mockFrom } as any

let repo: DashboardRepository

beforeEach(() => {
  vi.clearAllMocks()
  tableQueries = new Map()
  repo = new DashboardRepository(mockSupabase)
})

describe('getRecentActivity', () => {
  it('returns mapped activity events', async () => {
    tableQueries.set('intake_events', {
      dataResult: [{
        id: 'evt-1',
        created_at: '2026-04-06T14:00:00Z',
        operator_name: 'Mike S.',
        ai_taxonomy_result: { taxonomy: { confidence: 0.92 } },
        source_photos: [],
        asset_id: 'a-1',
        assets: { id: 'a-1', make: 'CAT', model: '320F', category: 'Earthmoving', status: 'intake', photos: [{}, {}, {}] },
      }],
    })

    const result = await repo.getRecentActivity(10)
    expect(result).toHaveLength(1)
    expect(result[0].operatorName).toBe('Mike S.')
    expect(result[0].assetName).toBe('CAT 320F')
    expect(result[0].confidence).toBe(0.92)
    expect(result[0].photoCount).toBe(3)
  })

  it('returns empty array when no events', async () => {
    tableQueries.set('intake_events', { dataResult: [] })
    const result = await repo.getRecentActivity(10)
    expect(result).toEqual([])
  })
})

describe('getCategoryBreakdown', () => {
  it('groups and sorts by count descending', async () => {
    tableQueries.set('assets', {
      dataResult: [
        { category: 'Earthmoving' },
        { category: 'Earthmoving' },
        { category: 'Trucking' },
        { category: 'Earthmoving' },
        { category: 'Trucking' },
        { category: 'Aerial' },
      ],
    })

    const result = await repo.getCategoryBreakdown('week')
    expect(result[0]).toEqual({ category: 'Earthmoving', count: 3 })
    expect(result[1]).toEqual({ category: 'Trucking', count: 2 })
    expect(result[2]).toEqual({ category: 'Aerial', count: 1 })
  })
})

describe('getIntakeVolume', () => {
  it('returns empty for no assets', async () => {
    tableQueries.set('assets', { dataResult: [] })
    const result = await repo.getIntakeVolume('today')
    expect(result).toEqual([])
  })
})
