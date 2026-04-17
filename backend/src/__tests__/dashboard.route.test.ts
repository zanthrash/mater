import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'
import { dashboardRoute } from '../routes/dashboard.js'

vi.mock('../config.js', () => ({
  config: {
    supabaseUrl: 'http://localhost:54321',
    supabaseKey: 'test-service-key',
    anthropicApiKey: 'test-anthropic-key',
  },
}))

const mockGetStats = vi.fn()
const mockGetIntakeVolume = vi.fn()
const mockGetCategoryBreakdown = vi.fn()
const mockGetOperatorStats = vi.fn()
const mockGetAiInsights = vi.fn()
const mockGetRecentActivity = vi.fn()

vi.mock('../repositories/DashboardRepository.js', () => ({
  DashboardRepository: vi.fn(() => ({
    getStats: mockGetStats,
    getIntakeVolume: mockGetIntakeVolume,
    getCategoryBreakdown: mockGetCategoryBreakdown,
    getOperatorStats: mockGetOperatorStats,
    getAiInsights: mockGetAiInsights,
    getRecentActivity: mockGetRecentActivity,
  })),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({})),
}))

function buildTestApp() {
  const app = Fastify()
  app.register(dashboardRoute)
  return app
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/dashboard/stats', () => {
  it('returns stats for default period', async () => {
    const stats = { intakeCount: 47, intakeCountPrevious: 42, activeOperators: 5, totalOperators: 8, needsReviewCount: 12, needsReviewBreakdown: { lowConfidence: 4, missingFields: 8 }, avgConfidence: 0.84 }
    mockGetStats.mockResolvedValue(stats)
    const app = buildTestApp()
    const response = await app.inject({ method: 'GET', url: '/api/dashboard/stats' })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual(stats)
    expect(mockGetStats).toHaveBeenCalledWith('today')
    await app.close()
  })

  it('passes period query param', async () => {
    mockGetStats.mockResolvedValue({})
    const app = buildTestApp()
    await app.inject({ method: 'GET', url: '/api/dashboard/stats?period=week' })
    expect(mockGetStats).toHaveBeenCalledWith('week')
    await app.close()
  })

  it('returns 500 on error', async () => {
    mockGetStats.mockRejectedValue(new Error('DB down'))
    const app = buildTestApp()
    const response = await app.inject({ method: 'GET', url: '/api/dashboard/stats' })
    expect(response.statusCode).toBe(500)
    expect(response.json()).toEqual({ error: 'DB down' })
    await app.close()
  })
})

describe('GET /api/dashboard/activity', () => {
  it('returns activity events', async () => {
    const events = [{ id: 'e1', type: 'submission', operatorName: 'Mike', assetId: 'a1', assetName: 'CAT 320F', category: 'Earthmoving', confidence: 0.92, status: 'intake', createdAt: '2026-04-06T14:00:00Z', photoCount: 7 }]
    mockGetRecentActivity.mockResolvedValue(events)
    const app = buildTestApp()
    const response = await app.inject({ method: 'GET', url: '/api/dashboard/activity' })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ events })
    expect(mockGetRecentActivity).toHaveBeenCalledWith(20, undefined)
    await app.close()
  })

  it('passes limit and since params', async () => {
    mockGetRecentActivity.mockResolvedValue([])
    const app = buildTestApp()
    await app.inject({ method: 'GET', url: '/api/dashboard/activity?limit=5&since=2026-04-06T14:00:00Z' })
    expect(mockGetRecentActivity).toHaveBeenCalledWith(5, '2026-04-06T14:00:00Z')
    await app.close()
  })
})

describe('GET /api/dashboard/intake-volume', () => {
  it('returns buckets', async () => {
    mockGetIntakeVolume.mockResolvedValue([{ label: 'Mon', count: 32 }])
    const app = buildTestApp()
    const response = await app.inject({ method: 'GET', url: '/api/dashboard/intake-volume?period=week' })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ buckets: [{ label: 'Mon', count: 32 }] })
    await app.close()
  })
})

describe('GET /api/dashboard/category-breakdown', () => {
  it('returns categories', async () => {
    mockGetCategoryBreakdown.mockResolvedValue([{ category: 'Earthmoving', count: 18 }])
    const app = buildTestApp()
    const response = await app.inject({ method: 'GET', url: '/api/dashboard/category-breakdown?period=month' })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ categories: [{ category: 'Earthmoving', count: 18 }] })
    await app.close()
  })
})

describe('GET /api/dashboard/operators', () => {
  it('returns operator stats', async () => {
    mockGetOperatorStats.mockResolvedValue([{ id: 'u1', displayName: 'Mike', intakeCount: 14 }])
    const app = buildTestApp()
    const response = await app.inject({ method: 'GET', url: '/api/dashboard/operators?period=today' })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ operators: [{ id: 'u1', displayName: 'Mike', intakeCount: 14 }] })
    await app.close()
  })
})

describe('GET /api/dashboard/ai-insights', () => {
  it('returns insights', async () => {
    const insights = { avgClassificationConfidence: 0.84, avgSpecConfidence: 0.79 }
    mockGetAiInsights.mockResolvedValue(insights)
    const app = buildTestApp()
    const response = await app.inject({ method: 'GET', url: '/api/dashboard/ai-insights?period=week' })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual(insights)
    await app.close()
  })
})
