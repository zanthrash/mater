import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useOperatorStats } from '@/api/hooks'
import type { Period } from '@/api/types'
import { KPICard } from '@/components/KPICard'
import { PeriodToggle } from '@/components/PeriodToggle'
import { ConfidenceBadge } from '@/components/ConfidenceBadge'

export const Route = createFileRoute('/operators')({
  component: Operators,
})

const avatarColors = ['#3B82F6', '#8B5CF6', '#F59E0B', '#EC4899', '#10B981', '#EF4444', '#06B6D4', '#84CC16']

function Operators() {
  const [period, setPeriod] = useState<Period>('today')
  const navigate = useNavigate()
  const { data: operators } = useOperatorStats(period)

  const ops = operators ?? []
  const totalIntakes = ops.reduce((s, o) => s + o.intakeCount, 0)
  const avgConf = ops.length > 0 ? ops.reduce((s, o) => s + o.avgConfidence, 0) / ops.length : 0
  const totalFlagged = ops.reduce((s, o) => s + o.flaggedCount, 0)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-[var(--color-text-primary)]">Operators</h1>
          <p className="text-[10px] text-[var(--color-text-muted)]">{ops.length} registered · {ops.filter(o => o.isActive).length} active</p>
        </div>
        <PeriodToggle value={period} onChange={setPeriod} />
      </div>

      {/* KPIs */}
      <div className="px-4 py-3 flex gap-2.5">
        <KPICard label="Total Intakes" value={totalIntakes} />
        <KPICard label="Avg per Operator" value={ops.length > 0 ? (totalIntakes / ops.length).toFixed(1) : '0'} />
        <KPICard label="Avg Confidence" value={`${Math.round(avgConf * 100)}%`} />
        <KPICard label="Review Rate" value={`${totalIntakes > 0 ? Math.round((totalFlagged / totalIntakes) * 100) : 0}%`} subtitle={`${totalFlagged} of ${totalIntakes} flagged`} />
      </div>

      {/* Operator Cards */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-2">
        {ops.map((op, idx) => {
          const flagRate = op.intakeCount > 0 ? op.flaggedCount / op.intakeCount : 0
          const isHighFlagRate = flagRate > 0.4
          const color = avatarColors[idx % avatarColors.length]
          const initials = op.displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

          return (
            <div
              key={op.id}
              onClick={() => navigate({ to: '/assets', search: { userId: op.id } as any })}
              className={`rounded-xl p-3.5 flex items-center gap-3.5 cursor-pointer ${isHighFlagRate ? 'border border-[var(--color-accent-red)]/15' : 'bg-[var(--color-surface-card)] border border-[var(--color-border-subtle)]'}`}
              style={isHighFlagRate ? { background: `linear-gradient(135deg, rgba(239,68,68,0.06), var(--color-surface-card))` } : undefined}
            >
              <div className="relative">
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm text-white font-semibold" style={{ backgroundColor: color }}>
                  {initials}
                </div>
                <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[var(--color-surface-card)] ${op.isActive ? 'bg-[var(--color-accent-green)]' : 'bg-[var(--color-text-muted)]'}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-[var(--color-text-primary)]">{op.displayName}</span>
                  {idx === 0 && <span className="text-[8px] text-[var(--color-accent-amber)] bg-[var(--color-accent-amber)]/10 px-1.5 py-0.5 rounded">🏆 #1</span>}
                  {idx > 0 && <span className="text-[8px] text-[var(--color-text-secondary)] bg-[var(--color-text-secondary)]/10 px-1.5 py-0.5 rounded">#{idx + 1}</span>}
                  <span className={`text-[8px] ${op.isActive ? 'text-[var(--color-accent-green)]' : 'text-[var(--color-text-muted)]'}`}>
                    {op.isActive ? '● Active now' : `○ Idle`}
                  </span>
                  {isHighFlagRate && <span className="text-[8px] text-[var(--color-accent-red)] bg-[var(--color-accent-red)]/10 px-1.5 py-0.5 rounded">⚠️ High flag rate</span>}
                </div>
                <div className="text-[9px] text-[var(--color-text-muted)] mt-0.5">{op.email}{op.lastIntakeAt && <> · Last intake {new Date(op.lastIntakeAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</>}</div>
              </div>
              <div className="flex gap-4 items-center">
                <div className="text-center"><div className="text-xl font-bold text-[var(--color-text-primary)]">{op.intakeCount}</div><div className="text-[8px] text-[var(--color-text-muted)]">intakes</div></div>
                <div className="text-center"><div className="text-xl font-bold"><ConfidenceBadge value={op.avgConfidence} /></div><div className="text-[8px] text-[var(--color-text-muted)]">avg conf.</div></div>
                <div className="text-center"><div className="text-xl font-bold" style={{ color: op.flaggedCount > 0 ? 'var(--color-accent-amber)' : 'var(--color-text-primary)' }}>{op.flaggedCount}</div><div className="text-[8px] text-[var(--color-text-muted)]">flagged</div></div>
                <div className="w-28">
                  <div className="flex justify-between text-[8px] text-[var(--color-text-muted)] mb-1"><span>Volume</span><span>{op.intakeCount} / {totalIntakes}</span></div>
                  <div className="h-1.5 bg-[var(--color-surface-primary)] rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${totalIntakes > 0 ? (op.intakeCount / totalIntakes) * 100 : 0}%`, backgroundColor: color }} /></div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
