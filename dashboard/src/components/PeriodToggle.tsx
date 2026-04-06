import type { Period } from '@/api/types'

const options: { value: Period; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
]

export function PeriodToggle({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <div className="flex gap-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`text-xs px-2.5 py-1 rounded-md transition-colors ${value === opt.value ? 'bg-[var(--color-surface-card)] text-[var(--color-text-primary)] border border-white/[0.08]' : 'text-[var(--color-text-muted)] bg-[var(--color-surface-primary)]'}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
