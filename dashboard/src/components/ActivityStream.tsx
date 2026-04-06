import { useState } from 'react'
import { useActivityStream } from '@/api/hooks'
import { ConfidenceBadge } from './ConfidenceBadge'
import { ChevronLeft, ChevronRight } from 'lucide-react'

function getEventColor(confidence: number | null): string {
  if (confidence === null) return 'var(--color-accent-blue)'
  if (confidence < 0.5) return 'var(--color-accent-red)'
  if (confidence < 0.7) return 'var(--color-accent-amber)'
  return 'var(--color-accent-blue)'
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

export function ActivityStream({ collapsed = false }: { collapsed?: boolean }) {
  const [isCollapsed, setIsCollapsed] = useState(collapsed)
  const { data: events } = useActivityStream()

  if (isCollapsed) {
    return (
      <div className="w-9 bg-[var(--color-surface-primary)] border-l border-[var(--color-border)] flex flex-col items-center pt-3 cursor-pointer shrink-0" onClick={() => setIsCollapsed(false)}>
        <span className="text-[var(--color-text-muted)] text-xs [writing-mode:vertical-rl] tracking-widest">ACTIVITY</span>
        <ChevronLeft size={14} className="text-[var(--color-text-muted)] mt-2" />
      </div>
    )
  }

  return (
    <div className="w-56 bg-[var(--color-surface-primary)] border-l border-[var(--color-border)] flex flex-col shrink-0">
      <div className="px-3 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
        <span className="text-sm font-semibold text-[var(--color-text-primary)]">Activity</span>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-[var(--color-accent-red)] rounded-full animate-pulse" />
          <span className="text-xs text-[var(--color-accent-red)]">Live</span>
          <button onClick={() => setIsCollapsed(true)} className="ml-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
        {(events ?? []).map((evt) => {
          const color = getEventColor(evt.confidence)
          return (
            <div key={evt.id} className="rounded-lg p-2 text-xs" style={{ backgroundColor: `color-mix(in srgb, ${color} 8%, transparent)`, borderLeft: `3px solid ${color}` }}>
              <div className="flex justify-between items-center">
                <span className="font-semibold" style={{ color }}>{evt.operatorName}</span>
                <span className="text-[var(--color-text-muted)] text-[10px]">{timeAgo(evt.createdAt)}</span>
              </div>
              <div className="text-[var(--color-text-secondary)] mt-1">
                Submitted <strong className="text-[var(--color-text-primary)]">{evt.assetName}</strong>
              </div>
              <div className="text-[var(--color-text-muted)] mt-0.5">
                {evt.category}{evt.confidence !== null && <> · <ConfidenceBadge value={evt.confidence} /></>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
