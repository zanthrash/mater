import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useAiInsights, useTokenUsage } from '@/api/hooks'
import type { Period } from '@/api/types'
import { KPICard } from '@/components/KPICard'
import { PeriodToggle } from '@/components/PeriodToggle'

export const Route = createFileRoute('/ai-insights')({
  component: AiInsights,
})

const bucketColors: Record<string, string> = {
  '0-20': '#EF4444', '20-40': '#EF4444', '40-60': '#F59E0B', '60-80': '#F59E0B', '80-100': '#10B981',
}

function AiInsights() {
  const [period, setPeriod] = useState<Period>('week')
  const { data: insights } = useAiInsights(period)
  const { data: tokenUsage } = useTokenUsage(period)

  if (!insights) return <div className="p-4 text-[var(--color-text-muted)]">Loading...</div>

  const vinTotal = insights.vinSources.nhtsa + insights.vinSources.claude + insights.vinSources.none

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-[var(--color-text-primary)]">AI Insights</h1>
          <p className="text-[10px] text-[var(--color-text-muted)]">Classification & spec extraction performance</p>
        </div>
        <PeriodToggle value={period} onChange={setPeriod} />
      </div>

      {/* KPIs */}
      <div className="px-4 py-3 flex gap-2.5">
        <KPICard label="Avg Classification Confidence" value={`${Math.round(insights.avgClassificationConfidence * 100)}%`} />
        <KPICard label="Avg Spec Confidence" value={`${Math.round(insights.avgSpecConfidence * 100)}%`} />
        <KPICard label="Override Rate" value={`${Math.round(insights.overrideRate * 100)}%`} />
        <KPICard label="VIN Match Rate" value={`${Math.round(insights.vinMatchRate * 100)}%`} />
      </div>

      {/* Charts */}
      <div className="flex-1 px-4 pb-4 flex gap-3 overflow-hidden">
        {/* Left Column */}
        <div className="flex-[3] flex flex-col gap-3">
          {/* Confidence Trend */}
          <div className="bg-[var(--color-surface-card)] rounded-xl p-3.5 border border-[var(--color-border-subtle)]">
            <div className="text-xs font-semibold text-[var(--color-text-primary)] mb-3">Confidence Trend</div>
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={insights.confidenceTrend}>
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#475569' }} axisLine={false} tickLine={false} tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { weekday: 'short' })} />
                <YAxis tick={{ fontSize: 9, fill: '#475569' }} axisLine={false} tickLine={false} domain={[0.5, 1]} tickFormatter={(v) => `${Math.round(v * 100)}%`} width={35} />
                <Tooltip contentStyle={{}} wrapperStyle={{}} cursor={{ fill: 'var(--color-border)' }} formatter={(v: number) => `${Math.round(v * 100)}%`} />
                <Line type="monotone" dataKey="classification" stroke="#10B981" strokeWidth={2} dot={false} name="Classification" />
                <Line type="monotone" dataKey="spec" stroke="#3B82F6" strokeWidth={2} dot={false} strokeDasharray="4 3" name="Spec Extraction" />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-1 pl-9">
              <div className="flex items-center gap-1"><div className="w-3 h-0.5 bg-[var(--color-accent-green)]" /><span className="text-[8px] text-[var(--color-text-secondary)]">Classification</span></div>
              <div className="flex items-center gap-1"><div className="w-3 h-0.5 bg-[var(--color-accent-blue)]" style={{ borderTop: '1px dashed var(--color-accent-blue)' }} /><span className="text-[8px] text-[var(--color-text-secondary)]">Spec Extraction</span></div>
            </div>
          </div>

          {/* Confidence Distribution */}
          <div className="bg-[var(--color-surface-card)] rounded-xl p-3.5 border border-[var(--color-border-subtle)]">
            <div className="text-xs font-semibold text-[var(--color-text-primary)] mb-3">Confidence Distribution</div>
            <ResponsiveContainer width="100%" height={90}>
              <BarChart data={insights.confidenceDistribution}>
                <XAxis dataKey="bucket" tick={{ fontSize: 9, fill: '#475569' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#475569' }} axisLine={false} tickLine={false} width={30} />
                <Tooltip contentStyle={{}} wrapperStyle={{}} cursor={{ fill: 'var(--color-border)' }} />
                <Bar dataKey="count" radius={[3, 3, 0, 0]} fill="#3B82F6">
                  {insights.confidenceDistribution.map((entry, i) => (
                    <rect key={i} fill={bucketColors[entry.bucket] ?? '#3B82F6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Misclassifications */}
          <div className="flex-1 bg-[var(--color-surface-card)] rounded-xl p-3.5 border border-[var(--color-border-subtle)] overflow-auto">
            <div className="text-xs font-semibold text-[var(--color-text-primary)] mb-2.5">Common Misclassifications</div>
            <div className="flex flex-col gap-1.5">
              {insights.misclassifications.slice(0, 5).map((m, i) => (
                <div key={i} className="flex items-center gap-2 bg-[var(--color-surface-primary)] rounded-lg p-2 text-[10px]">
                  <span className="text-[var(--color-accent-red)] font-semibold w-6">{m.count}×</span>
                  <span className="text-[var(--color-text-secondary)]">AI said</span>
                  <span className="bg-[var(--color-accent-blue)]/15 text-[var(--color-accent-blue)] px-1.5 py-0.5 rounded text-[9px]">{m.aiCategory}</span>
                  <span className="text-[var(--color-text-muted)]">→ was</span>
                  <span className="bg-[var(--color-accent-amber)]/15 text-[var(--color-accent-amber)] px-1.5 py-0.5 rounded text-[9px]">{m.actualCategory}</span>
                </div>
              ))}
              {insights.misclassifications.length === 0 && <div className="text-[10px] text-[var(--color-text-muted)]">No misclassifications in this period</div>}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="flex-[2] flex flex-col gap-3">
          {/* Accuracy by Category */}
          <div className="bg-[var(--color-surface-card)] rounded-xl p-3.5 border border-[var(--color-border-subtle)]">
            <div className="text-xs font-semibold text-[var(--color-text-primary)] mb-2.5">Accuracy by Category</div>
            <div className="flex flex-col gap-2">
              {insights.categoryAccuracy.map((cat) => {
                const pct = Math.round(cat.avgConfidence * 100)
                const color = pct >= 80 ? 'var(--color-accent-green)' : pct >= 60 ? 'var(--color-accent-amber)' : 'var(--color-accent-red)'
                return (
                  <div key={cat.category}>
                    <div className="flex justify-between text-[10px] mb-1"><span className="text-[var(--color-text-secondary)]">{cat.category}</span><span className="font-semibold" style={{ color }}>{pct}%</span></div>
                    <div className="h-1.5 bg-[var(--color-surface-primary)] rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} /></div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* AI vs VIN Agreement */}
          <div className="bg-[var(--color-surface-card)] rounded-xl p-3.5 border border-[var(--color-border-subtle)]">
            <div className="text-xs font-semibold text-[var(--color-text-primary)] mb-2.5">AI vs VIN Agreement</div>
            <div className="flex flex-col gap-1.5">
              {Object.entries(insights.vinAgreement).map(([field, rate]) => {
                const pct = Math.round(rate * 100)
                const color = pct >= 80 ? 'var(--color-accent-green)' : 'var(--color-accent-amber)'
                const label = field.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())
                return (
                  <div key={field}>
                    <div className="flex justify-between text-[10px] mb-1"><span className="text-[var(--color-text-secondary)]">{label}</span><span style={{ color }}>{pct}% match</span></div>
                    <div className="h-1 bg-[var(--color-surface-primary)] rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} /></div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* VIN Sources */}
          <div className="flex-1 bg-[var(--color-surface-card)] rounded-xl p-3.5 border border-[var(--color-border-subtle)]">
            <div className="text-xs font-semibold text-[var(--color-text-primary)] mb-2.5">VIN Lookup Sources</div>
            <div className="flex gap-3 items-center mb-2">
              <div className="text-center flex-1"><div className="text-2xl font-bold text-[var(--color-accent-green)]">{Math.round(insights.vinSources.nhtsa * 100)}%</div><div className="text-[9px] text-[var(--color-text-muted)]">NHTSA</div></div>
              <div className="text-center flex-1"><div className="text-2xl font-bold text-[var(--color-accent-purple)]">{Math.round(insights.vinSources.claude * 100)}%</div><div className="text-[9px] text-[var(--color-text-muted)]">Claude</div></div>
              <div className="text-center flex-1"><div className="text-2xl font-bold text-[var(--color-text-muted)]">{Math.round(insights.vinSources.none * 100)}%</div><div className="text-[9px] text-[var(--color-text-muted)]">No VIN</div></div>
            </div>
            <div className="h-2 flex rounded-full overflow-hidden">
              <div style={{ width: `${insights.vinSources.nhtsa * 100}%` }} className="bg-[var(--color-accent-green)]" />
              <div style={{ width: `${insights.vinSources.claude * 100}%` }} className="bg-[var(--color-accent-purple)]" />
              <div style={{ width: `${insights.vinSources.none * 100}%` }} className="bg-[var(--color-text-muted)]/40" />
            </div>
          </div>
        </div>
      </div>

      {/* Token Usage & Cost */}
      {tokenUsage && (
        <div className="px-4 pb-4 flex flex-col gap-3">
          <div className="text-xs font-semibold text-[var(--color-text-secondary)] pt-1">Token Usage & Cost</div>

          {/* KPIs */}
          <div className="flex gap-2.5">
            <KPICard label="Total Tokens" value={(tokenUsage.totalInputTokens + tokenUsage.totalOutputTokens).toLocaleString()} />
            <KPICard label="Total Cost" value={`$${(tokenUsage.totalCostCents / 100).toFixed(4)}`} />
            <KPICard label="Avg Tokens / Request" value={Math.round((tokenUsage.totalInputTokens + tokenUsage.totalOutputTokens) / Math.max(tokenUsage.requestCount, 1)).toLocaleString()} />
            <KPICard label="API Requests" value={tokenUsage.requestCount.toLocaleString()} />
          </div>

          {/* Charts */}
          <div className="flex gap-3">
            {/* Cost over time */}
            <div className="flex-[3] bg-[var(--color-surface-card)] rounded-xl p-3.5 border border-[var(--color-border-subtle)]">
              <div className="text-xs font-semibold text-[var(--color-text-primary)] mb-3">Cost Over Time</div>
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={tokenUsage.costOverTime}>
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#475569' }} axisLine={false} tickLine={false} tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { weekday: 'short' })} />
                  <YAxis tick={{ fontSize: 9, fill: '#475569' }} axisLine={false} tickLine={false} width={45} tickFormatter={(v) => `$${(v / 100).toFixed(3)}`} />
                  <Tooltip contentStyle={{}} wrapperStyle={{}} cursor={{ fill: 'var(--color-border)' }} formatter={(v: number) => [`$${(v / 100).toFixed(4)}`, 'Cost']} />
                  <Line type="monotone" dataKey="costCents" stroke="#10B981" strokeWidth={2} dot={false} name="Cost" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Usage by operation */}
            <div className="flex-[2] bg-[var(--color-surface-card)] rounded-xl p-3.5 border border-[var(--color-border-subtle)]">
              <div className="text-xs font-semibold text-[var(--color-text-primary)] mb-3">Tokens by Operation</div>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={tokenUsage.usageByOperation}>
                  <XAxis dataKey="operation" tick={{ fontSize: 9, fill: '#475569' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: '#475569' }} axisLine={false} tickLine={false} width={35} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                  <Tooltip contentStyle={{}} wrapperStyle={{}} cursor={{ fill: 'var(--color-border)' }} />
                  <Bar dataKey="inputTokens" stackId="a" fill="#3B82F6" name="Input" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="outputTokens" stackId="a" fill="#10B981" name="Output" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex gap-4 mt-1 pl-9">
                <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-[#3B82F6]" /><span className="text-[8px] text-[var(--color-text-secondary)]">Input</span></div>
                <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-[#10B981]" /><span className="text-[8px] text-[var(--color-text-secondary)]">Output</span></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
