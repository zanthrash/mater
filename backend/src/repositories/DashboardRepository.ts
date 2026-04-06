import type { SupabaseClient } from '@supabase/supabase-js'

export type Period = 'today' | 'week' | 'month'

export interface DashboardStats {
  intakeCount: number
  intakeCountPrevious: number
  activeOperators: number
  totalOperators: number
  needsReviewCount: number
  needsReviewBreakdown: { lowConfidence: number; missingFields: number }
  avgConfidence: number
}

export interface IntakeVolumeBucket {
  label: string
  count: number
}

export interface CategoryCount {
  category: string
  count: number
}

export interface OperatorStats {
  id: string
  displayName: string
  email: string
  intakeCount: number
  avgConfidence: number
  flaggedCount: number
  lastIntakeAt: string | null
  isActive: boolean
}

export interface AiInsights {
  avgClassificationConfidence: number
  avgSpecConfidence: number
  overrideRate: number
  vinMatchRate: number
  confidenceTrend: Array<{ date: string; classification: number; spec: number }>
  confidenceDistribution: Array<{ bucket: string; count: number }>
  misclassifications: Array<{ aiCategory: string; actualCategory: string; count: number }>
  categoryAccuracy: Array<{ category: string; avgConfidence: number }>
  vinAgreement: { make: number; model: number; year: number; engineType: number; gvw: number }
  vinSources: { nhtsa: number; claude: number; none: number }
}

export interface ActivityEvent {
  id: string
  type: string
  operatorName: string
  assetId: string
  assetName: string
  category: string
  confidence: number | null
  status: string
  createdAt: string
  photoCount: number
}

export class DashboardRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  private getDateRange(period: Period): { start: string; end: string } {
    const now = new Date()
    const end = now.toISOString()
    let start: Date

    switch (period) {
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'week':
        start = new Date(now)
        start.setDate(start.getDate() - 7)
        break
      case 'month':
        start = new Date(now)
        start.setMonth(start.getMonth() - 1)
        break
    }
    return { start: start.toISOString(), end }
  }

  private getPreviousDateRange(period: Period): { start: string; end: string } {
    const { start, end } = this.getDateRange(period)
    const duration = new Date(end).getTime() - new Date(start).getTime()
    const prevEnd = new Date(start)
    const prevStart = new Date(prevEnd.getTime() - duration)
    return { start: prevStart.toISOString(), end: prevEnd.toISOString() }
  }

  async getStats(period: Period): Promise<DashboardStats> {
    const { start, end } = this.getDateRange(period)
    const prev = this.getPreviousDateRange(period)

    // Current period count
    const { count: intakeCount } = await this.supabase
      .from('assets')
      .select('*', { count: 'exact', head: true })
      .neq('status', 'deleted')
      .gte('created_at', start)
      .lte('created_at', end)

    // Previous period count
    const { count: intakeCountPrevious } = await this.supabase
      .from('assets')
      .select('*', { count: 'exact', head: true })
      .neq('status', 'deleted')
      .gte('created_at', prev.start)
      .lte('created_at', prev.end)

    // Needs review count
    const { count: needsReviewCount } = await this.supabase
      .from('assets')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'needs_review')

    // Active operators (intake in last 30 min)
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
    const { data: recentEvents } = await this.supabase
      .from('intake_events')
      .select('asset_id, assets!inner(user_id)')
      .gte('created_at', thirtyMinAgo)

    const activeUserIds = new Set(
      (recentEvents ?? [])
        .map((e: Record<string, unknown>) => (e.assets as Record<string, unknown>)?.user_id)
        .filter(Boolean)
    )

    // Total operators
    const { count: totalOperators } = await this.supabase
      .from('users')
      .select('*', { count: 'exact', head: true })

    // Avg confidence — fetch intake events in range with ai_taxonomy_result
    const { data: eventsWithConf } = await this.supabase
      .from('intake_events')
      .select('ai_taxonomy_result')
      .gte('created_at', start)
      .lte('created_at', end)

    let totalConf = 0
    let confCount = 0
    let lowConfCount = 0
    for (const evt of eventsWithConf ?? []) {
      const conf = (evt.ai_taxonomy_result as Record<string, unknown>)?.taxonomy as Record<string, unknown> | undefined
      const score = typeof conf?.confidence === 'number' ? conf.confidence : null
      if (score !== null) {
        totalConf += score
        confCount++
        if (score < 0.70) lowConfCount++
      }
    }

    // Missing fields count for needs_review breakdown
    const { count: missingFieldsCount } = await this.supabase
      .from('assets')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'needs_review')
      .or('make.is.null,model.is.null,year.is.null')

    return {
      intakeCount: intakeCount ?? 0,
      intakeCountPrevious: intakeCountPrevious ?? 0,
      activeOperators: activeUserIds.size,
      totalOperators: totalOperators ?? 0,
      needsReviewCount: needsReviewCount ?? 0,
      needsReviewBreakdown: {
        lowConfidence: Math.max(0, (needsReviewCount ?? 0) - (missingFieldsCount ?? 0)),
        missingFields: missingFieldsCount ?? 0,
      },
      avgConfidence: confCount > 0 ? totalConf / confCount : 0,
    }
  }

  async getIntakeVolume(period: Period): Promise<IntakeVolumeBucket[]> {
    const { start, end } = this.getDateRange(period)

    const { data: assets } = await this.supabase
      .from('assets')
      .select('created_at')
      .neq('status', 'deleted')
      .gte('created_at', start)
      .lte('created_at', end)
      .order('created_at', { ascending: true })

    if (!assets || assets.length === 0) return []

    const buckets = new Map<string, number>()
    for (const asset of assets) {
      const date = new Date(asset.created_at)
      let label: string
      if (period === 'today') {
        label = `${date.getHours().toString().padStart(2, '0')}:00`
      } else if (period === 'week') {
        label = date.toLocaleDateString('en-US', { weekday: 'short' })
      } else {
        label = `Week ${Math.ceil(date.getDate() / 7)}`
      }
      buckets.set(label, (buckets.get(label) ?? 0) + 1)
    }

    return Array.from(buckets, ([label, count]) => ({ label, count }))
  }

  async getCategoryBreakdown(period: Period): Promise<CategoryCount[]> {
    const { start, end } = this.getDateRange(period)

    const { data: assets } = await this.supabase
      .from('assets')
      .select('category')
      .neq('status', 'deleted')
      .gte('created_at', start)
      .lte('created_at', end)

    if (!assets) return []

    const counts = new Map<string, number>()
    for (const asset of assets) {
      const cat = asset.category ?? 'Unknown'
      counts.set(cat, (counts.get(cat) ?? 0) + 1)
    }

    return Array.from(counts, ([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
  }

  async getOperatorStats(period: Period): Promise<OperatorStats[]> {
    const { start, end } = this.getDateRange(period)
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()

    // Get all users
    const { data: users } = await this.supabase.from('users').select('*')
    if (!users) return []

    // Get assets in period with user_id
    const { data: assets } = await this.supabase
      .from('assets')
      .select('user_id, status, created_at')
      .neq('status', 'deleted')
      .gte('created_at', start)
      .lte('created_at', end)

    // Get intake events for confidence
    const { data: events } = await this.supabase
      .from('intake_events')
      .select('asset_id, created_at, ai_taxonomy_result, assets!inner(user_id)')
      .gte('created_at', start)
      .lte('created_at', end)

    const result: OperatorStats[] = []
    for (const user of users) {
      const userAssets = (assets ?? []).filter((a: Record<string, unknown>) => a.user_id === user.id)
      const userEvents = (events ?? []).filter(
        (e: Record<string, unknown>) => (e.assets as Record<string, unknown>)?.user_id === user.id
      )

      let totalConf = 0
      let confCount = 0
      let lastIntakeAt: string | null = null

      for (const evt of userEvents) {
        const conf = (evt.ai_taxonomy_result as Record<string, unknown>)?.taxonomy as Record<string, unknown> | undefined
        const score = typeof conf?.confidence === 'number' ? conf.confidence : null
        if (score !== null) {
          totalConf += score
          confCount++
        }
        if (!lastIntakeAt || evt.created_at > lastIntakeAt) {
          lastIntakeAt = evt.created_at as string
        }
      }

      result.push({
        id: user.id,
        displayName: user.display_name,
        email: user.email,
        intakeCount: userAssets.length,
        avgConfidence: confCount > 0 ? totalConf / confCount : 0,
        flaggedCount: userAssets.filter((a: Record<string, unknown>) => a.status === 'needs_review').length,
        lastIntakeAt,
        isActive: lastIntakeAt !== null && lastIntakeAt >= thirtyMinAgo,
      })
    }

    return result.sort((a, b) => b.intakeCount - a.intakeCount)
  }

  async getAiInsights(period: Period): Promise<AiInsights> {
    const { start, end } = this.getDateRange(period)

    // Fetch all intake events in period with related asset data
    const { data: events } = await this.supabase
      .from('intake_events')
      .select('*, assets!inner(category, type, subtype, make, model, year, engine_type, gvw_lbs)')
      .gte('created_at', start)
      .lte('created_at', end)
      .order('created_at', { ascending: true })

    if (!events || events.length === 0) {
      return {
        avgClassificationConfidence: 0, avgSpecConfidence: 0,
        overrideRate: 0, vinMatchRate: 0,
        confidenceTrend: [], confidenceDistribution: [],
        misclassifications: [], categoryAccuracy: [],
        vinAgreement: { make: 0, model: 0, year: 0, engineType: 0, gvw: 0 },
        vinSources: { nhtsa: 0, claude: 0, none: 0 },
      }
    }

    let classConfTotal = 0, classConfCount = 0
    let specConfTotal = 0, specConfCount = 0
    let overrideCount = 0, classifiedCount = 0
    let vinMatchMake = 0, vinMatchModel = 0, vinMatchYear = 0
    let vinMatchEngine = 0, vinMatchGvw = 0, vinCompareCount = 0
    let vinNhtsa = 0, vinClaude = 0, vinNone = 0

    const distBuckets: Record<string, number> = { '0-20': 0, '20-40': 0, '40-60': 0, '60-80': 0, '80-100': 0 }
    const catConfMap = new Map<string, { total: number; count: number }>()
    const misclassMap = new Map<string, number>()
    const trendMap = new Map<string, { classTotal: number; classCount: number; specTotal: number; specCount: number }>()

    for (const evt of events) {
      const aiTax = evt.ai_taxonomy_result as Record<string, unknown> | null
      const aiAnalysis = evt.ai_analysis_result as Record<string, unknown> | null
      const vinResult = evt.vin_lookup_result as Record<string, unknown> | null
      const asset = evt.assets as Record<string, unknown>

      // Classification confidence
      const taxData = aiTax?.taxonomy as Record<string, unknown> | undefined
      const classConf = typeof taxData?.confidence === 'number' ? taxData.confidence : null
      if (classConf !== null) {
        classConfTotal += classConf
        classConfCount++

        // Distribution
        const pct = classConf * 100
        if (pct < 20) distBuckets['0-20']++
        else if (pct < 40) distBuckets['20-40']++
        else if (pct < 60) distBuckets['40-60']++
        else if (pct < 80) distBuckets['60-80']++
        else distBuckets['80-100']++

        // Category accuracy
        const cat = asset.category as string
        if (cat) {
          const existing = catConfMap.get(cat) ?? { total: 0, count: 0 }
          existing.total += classConf
          existing.count++
          catConfMap.set(cat, existing)
        }
      }

      // Spec confidence
      const specConf = typeof aiAnalysis?.confidenceScore === 'number' ? aiAnalysis.confidenceScore : null
      if (specConf !== null) {
        specConfTotal += specConf
        specConfCount++
      }

      // Trend (group by date)
      const dateKey = new Date(evt.created_at).toISOString().split('T')[0]
      const trend = trendMap.get(dateKey) ?? { classTotal: 0, classCount: 0, specTotal: 0, specCount: 0 }
      if (classConf !== null) { trend.classTotal += classConf; trend.classCount++ }
      if (specConf !== null) { trend.specTotal += specConf; trend.specCount++ }
      trendMap.set(dateKey, trend)

      // Override detection
      if (taxData) {
        classifiedCount++
        const aiCat = taxData.category as string
        const aiType = taxData.type as string
        if (aiCat && asset.category && (aiCat !== asset.category || aiType !== asset.type)) {
          overrideCount++
          const key = `${aiCat}:${aiType}→${asset.category}:${asset.type}`
          misclassMap.set(key, (misclassMap.get(key) ?? 0) + 1)
        }
      }

      // VIN agreement
      if (vinResult && vinResult.source) {
        const src = vinResult.source as string
        if (src === 'nhtsa') vinNhtsa++
        else if (src === 'claude') vinClaude++

        vinCompareCount++
        if (vinResult.make && vinResult.make === asset.make) vinMatchMake++
        if (vinResult.model && vinResult.model === asset.model) vinMatchModel++
        if (vinResult.year && vinResult.year === asset.year) vinMatchYear++
        if (vinResult.engineType && vinResult.engineType === asset.engine_type) vinMatchEngine++
        if (vinResult.gvwLbs && vinResult.gvwLbs === asset.gvw_lbs) vinMatchGvw++
      } else {
        vinNone++
      }
    }

    const totalVinSources = vinNhtsa + vinClaude + vinNone
    const safe = (n: number, d: number) => d > 0 ? n / d : 0

    return {
      avgClassificationConfidence: safe(classConfTotal, classConfCount),
      avgSpecConfidence: safe(specConfTotal, specConfCount),
      overrideRate: safe(overrideCount, classifiedCount),
      vinMatchRate: safe(vinMatchMake + vinMatchModel + vinMatchYear, vinCompareCount * 3),
      confidenceTrend: Array.from(trendMap, ([date, t]) => ({
        date,
        classification: safe(t.classTotal, t.classCount),
        spec: safe(t.specTotal, t.specCount),
      })),
      confidenceDistribution: Object.entries(distBuckets).map(([bucket, count]) => ({ bucket, count })),
      misclassifications: Array.from(misclassMap, ([key, count]) => {
        const [ai, actual] = key.split('→')
        return { aiCategory: ai, actualCategory: actual, count }
      }).sort((a, b) => b.count - a.count).slice(0, 10),
      categoryAccuracy: Array.from(catConfMap, ([category, { total, count }]) => ({
        category,
        avgConfidence: total / count,
      })).sort((a, b) => b.avgConfidence - a.avgConfidence),
      vinAgreement: {
        make: safe(vinMatchMake, vinCompareCount),
        model: safe(vinMatchModel, vinCompareCount),
        year: safe(vinMatchYear, vinCompareCount),
        engineType: safe(vinMatchEngine, vinCompareCount),
        gvw: safe(vinMatchGvw, vinCompareCount),
      },
      vinSources: {
        nhtsa: safe(vinNhtsa, totalVinSources),
        claude: safe(vinClaude, totalVinSources),
        none: safe(vinNone, totalVinSources),
      },
    }
  }

  async getRecentActivity(limit: number = 20, since?: string): Promise<ActivityEvent[]> {
    let query = this.supabase
      .from('intake_events')
      .select('id, created_at, operator_name, ai_taxonomy_result, source_photos, asset_id, assets!inner(id, make, model, category, status, photos)')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (since) {
      query = query.gt('created_at', since)
    }

    const { data: events } = await query
    if (!events) return []

    return events.map((evt: Record<string, unknown>) => {
      const asset = evt.assets as Record<string, unknown>
      const aiTax = evt.ai_taxonomy_result as Record<string, unknown> | null
      const taxData = aiTax?.taxonomy as Record<string, unknown> | undefined
      const photos = asset.photos as unknown[] | null

      return {
        id: evt.id as string,
        type: 'submission',
        operatorName: (evt.operator_name as string) ?? 'Unknown',
        assetId: asset.id as string,
        assetName: [asset.make, asset.model].filter(Boolean).join(' ') || 'Unknown Asset',
        category: (asset.category as string) ?? 'Unknown',
        confidence: typeof taxData?.confidence === 'number' ? taxData.confidence : null,
        status: (asset.status as string) ?? 'intake',
        createdAt: evt.created_at as string,
        photoCount: photos?.length ?? 0,
      }
    })
  }
}
