import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useDashboardStats, useIntakeVolume, useCategoryBreakdown, useAssets, useOperatorStats } from '@/api/hooks'
import type { Period } from '@/api/types'
import { KPICard } from '@/components/KPICard'
import { PeriodToggle } from '@/components/PeriodToggle'
import { StatusBadge } from '@/components/StatusBadge'
import { ConfidenceBadge } from '@/components/ConfidenceBadge'

export const Route = createFileRoute('/')({
  component: CommandCenter,
})

function CommandCenter() {
  const [period, setPeriod] = useState<Period>('today')
  const navigate = useNavigate()
  const { data: stats } = useDashboardStats(period)
  const { data: volume } = useIntakeVolume(period)
  const { data: categories } = useCategoryBreakdown(period)
  const { data: assetsResult } = useAssets({ limit: 10 })
  const { data: operators } = useOperatorStats(period)

  const delta = stats && stats.intakeCountPrevious > 0
    ? Math.round(((stats.intakeCount - stats.intakeCountPrevious) / stats.intakeCountPrevious) * 100)
    : null

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-[var(--color-text-primary)]">Command Center</h1>
          <p className="text-[10px] text-[var(--color-text-muted)]">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <PeriodToggle value={period} onChange={setPeriod} />
      </div>

      {/* KPI Strip */}
      <div className="px-4 py-3 flex gap-2.5">
        <KPICard label="Today's Intakes" value={stats?.intakeCount ?? 0} delta={delta !== null ? `${delta > 0 ? '↑' : '↓'} ${Math.abs(delta)}%` : undefined} deltaColor={delta !== null && delta > 0 ? 'var(--color-accent-green)' : 'var(--color-accent-red)'} subtitle={`vs ${stats?.intakeCountPrevious ?? 0} previous`} />
        <KPICard label="Active Operators" value={`${stats?.activeOperators ?? 0} / ${stats?.totalOperators ?? 0}`} subtitle={`${(stats?.totalOperators ?? 0) - (stats?.activeOperators ?? 0)} idle > 30min`} />
        <KPICard label="Needs Review" value={stats?.needsReviewCount ?? 0} subtitle={`${stats?.needsReviewBreakdown?.lowConfidence ?? 0} low confidence · ${stats?.needsReviewBreakdown?.missingFields ?? 0} missing fields`} highlight highlightColor="var(--color-accent-amber)" onClick={() => navigate({ to: '/assets', search: { status: 'needs_review' } })} />
        <KPICard label="AI Confidence" value={`${Math.round((stats?.avgConfidence ?? 0) * 100)}%`} subtitle={`avg across ${stats?.intakeCount ?? 0} intakes`} />
      </div>

      {/* Main Grid */}
      <div className="flex-1 px-4 pb-4 flex gap-2.5 overflow-hidden">
        {/* Left: Chart + Table */}
        <div className="flex-[2] flex flex-col gap-2.5">
          {/* Intake Volume Chart */}
          <div className="bg-[var(--color-surface-card)] rounded-xl p-3.5 border border-white/[0.04]">
            <div className="text-xs font-semibold text-[var(--color-text-primary)] mb-2.5">Intake Volume</div>
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={volume ?? []}>
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} width={30} />
                <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }} />
                <Bar dataKey="count" fill="#3B82F6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Recent Intakes Table */}
          <div className="flex-1 bg-[var(--color-surface-card)] rounded-xl p-3.5 border border-white/[0.04] overflow-hidden">
            <div className="flex justify-between items-center mb-2.5">
              <span className="text-xs font-semibold text-[var(--color-text-primary)]">Recent Intakes</span>
              <button onClick={() => navigate({ to: '/assets' })} className="text-[10px] text-[var(--color-accent-blue)]">View all →</button>
            </div>
            <div className="overflow-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-[var(--color-text-muted)] uppercase text-[9px] tracking-wider border-b border-white/[0.04]">
                    <th className="text-left py-1.5 font-medium">Time</th>
                    <th className="text-left py-1.5 font-medium">Asset</th>
                    <th className="text-left py-1.5 font-medium">Category</th>
                    <th className="text-center py-1.5 font-medium">Confidence</th>
                    <th className="text-right py-1.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(assetsResult?.data ?? []).map((asset) => (
                    <tr key={asset.id} className="border-b border-white/[0.03] cursor-pointer hover:bg-white/[0.02]" onClick={() => navigate({ to: '/assets/$id', params: { id: asset.id } })}>
                      <td className="py-2 text-[var(--color-text-muted)]">{new Date(asset.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="py-2 font-medium text-[var(--color-text-primary)]">{[asset.make, asset.model].filter(Boolean).join(' ') || 'Unknown'}</td>
                      <td className="py-2"><span className="bg-[var(--color-accent-blue)]/15 text-[var(--color-accent-blue)] px-1.5 py-0.5 rounded text-[9px]">{asset.category ?? 'Unknown'}</span></td>
                      <td className="py-2 text-center">—</td>
                      <td className="py-2 text-right"><StatusBadge status={asset.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Categories + Top Operators */}
        <div className="flex-1 flex flex-col gap-2.5">
          {/* Category Breakdown */}
          <div className="bg-[var(--color-surface-card)] rounded-xl p-3.5 border border-white/[0.04]">
            <div className="text-xs font-semibold text-[var(--color-text-primary)] mb-2.5">By Category</div>
            <div className="flex flex-col gap-1.5">
              {(categories ?? []).slice(0, 5).map((cat) => (
                <div key={cat.category} className="flex items-center gap-2">
                  <span className="flex-1 text-[10px] text-[var(--color-text-secondary)]">{cat.category}</span>
                  <span className="text-[10px] text-[var(--color-text-primary)] font-semibold">{cat.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Operators */}
          <div className="flex-1 bg-[var(--color-surface-card)] rounded-xl p-3.5 border border-white/[0.04]">
            <div className="flex justify-between items-center mb-2.5">
              <span className="text-xs font-semibold text-[var(--color-text-primary)]">Top Operators</span>
              <button onClick={() => navigate({ to: '/operators' })} className="text-[10px] text-[var(--color-accent-blue)]">View all →</button>
            </div>
            <div className="flex flex-col gap-2">
              {(operators ?? []).slice(0, 5).map((op) => (
                <div key={op.id} className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-[var(--color-accent-blue)] rounded-full flex items-center justify-center text-[9px] text-white font-semibold">
                    {op.displayName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1">
                    <div className="text-[11px] text-[var(--color-text-primary)] font-medium">{op.displayName}</div>
                    <div className="text-[9px] text-[var(--color-text-muted)]">{op.intakeCount} intakes · avg <ConfidenceBadge value={op.avgConfidence} /></div>
                  </div>
                  <span className={`text-[9px] ${op.isActive ? 'text-[var(--color-accent-green)]' : 'text-[var(--color-text-muted)]'}`}>
                    {op.isActive ? '● Active' : '○ Idle'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
