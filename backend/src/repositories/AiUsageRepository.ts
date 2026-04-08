import type { SupabaseClient } from '@supabase/supabase-js'
import type { Period } from './DashboardRepository.js'

const INPUT_COST_PER_MTOK = 3.0
const OUTPUT_COST_PER_MTOK = 15.0

export function calculateCostCents(inputTokens: number, outputTokens: number): number {
  return (inputTokens * INPUT_COST_PER_MTOK / 1_000_000 + outputTokens * OUTPUT_COST_PER_MTOK / 1_000_000) * 100
}

export interface AiUsageRecord {
  operation: string
  model: string
  input_tokens: number
  output_tokens: number
  cost_cents: number
  asset_id?: string
}

export interface TokenUsageResponse {
  totalInputTokens: number
  totalOutputTokens: number
  totalCostCents: number
  requestCount: number
  costOverTime: Array<{ date: string; costCents: number }>
  usageByOperation: Array<{ operation: string; inputTokens: number; outputTokens: number; costCents: number; count: number }>
}

export class AiUsageRepository {
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

  async insertUsage(record: AiUsageRecord): Promise<void> {
    await this.supabase.from('ai_api_usage').insert(record)
  }

  async getTokenUsage(period: Period): Promise<TokenUsageResponse> {
    const { start, end } = this.getDateRange(period)

    const { data, error } = await this.supabase
      .from('ai_api_usage')
      .select('*')
      .gte('created_at', start)
      .lte('created_at', end)
      .order('created_at', { ascending: true })

    if (error) throw new Error(error.message)

    const rows = data ?? []

    let totalInputTokens = 0
    let totalOutputTokens = 0
    let totalCostCents = 0

    const byDate = new Map<string, number>()
    const byOperation = new Map<string, { inputTokens: number; outputTokens: number; costCents: number; count: number }>()

    for (const row of rows) {
      totalInputTokens += row.input_tokens
      totalOutputTokens += row.output_tokens
      totalCostCents += Number(row.cost_cents)

      const dateKey = row.created_at.slice(0, 10)
      byDate.set(dateKey, (byDate.get(dateKey) ?? 0) + Number(row.cost_cents))

      const op = byOperation.get(row.operation) ?? { inputTokens: 0, outputTokens: 0, costCents: 0, count: 0 }
      op.inputTokens += row.input_tokens
      op.outputTokens += row.output_tokens
      op.costCents += Number(row.cost_cents)
      op.count += 1
      byOperation.set(row.operation, op)
    }

    return {
      totalInputTokens,
      totalOutputTokens,
      totalCostCents,
      requestCount: rows.length,
      costOverTime: Array.from(byDate.entries()).map(([date, costCents]) => ({ date, costCents })),
      usageByOperation: Array.from(byOperation.entries()).map(([operation, stats]) => ({ operation, ...stats })),
    }
  }
}
