export function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const color = pct >= 80 ? 'var(--color-accent-green)' : pct >= 50 ? 'var(--color-accent-amber)' : 'var(--color-accent-red)'
  return <span className="font-semibold" style={{ color }}>{pct}%</span>
}
