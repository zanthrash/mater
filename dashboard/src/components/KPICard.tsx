interface KPICardProps {
  label: string
  value: string | number
  subtitle?: string
  delta?: string
  deltaColor?: string
  highlight?: boolean
  highlightColor?: string
  onClick?: () => void
}

export function KPICard({ label, value, subtitle, delta, deltaColor, highlight, highlightColor = 'var(--color-accent-amber)', onClick }: KPICardProps) {
  return (
    <div
      className={`flex-1 rounded-xl p-3 border cursor-default ${highlight ? '' : 'bg-[var(--color-surface-card)] border-white/[0.04]'}`}
      style={highlight ? { background: `linear-gradient(135deg, color-mix(in srgb, ${highlightColor} 12%, transparent), color-mix(in srgb, ${highlightColor} 4%, transparent))`, borderColor: `color-mix(in srgb, ${highlightColor} 20%, transparent)` } : undefined}
      onClick={onClick}
    >
      <div className="flex justify-between items-center">
        <span className="text-[10px] text-[var(--color-text-secondary)] uppercase tracking-wider">{label}</span>
        {delta && <span className="text-[10px]" style={{ color: deltaColor }}>{delta}</span>}
      </div>
      <div className="text-2xl font-extrabold text-[var(--color-text-primary)] mt-0.5">{value}</div>
      {subtitle && <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{subtitle}</div>}
    </div>
  )
}
