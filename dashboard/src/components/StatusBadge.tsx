const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  intake: { bg: 'rgba(16,185,129,0.15)', text: '#34D399', label: 'Intake' },
  needs_review: { bg: 'rgba(245,158,11,0.15)', text: '#FBBF24', label: 'Needs Review' },
  reviewed: { bg: 'rgba(59,130,246,0.15)', text: '#60A5FA', label: 'Reviewed' },
  approved: { bg: 'rgba(16,185,129,0.15)', text: '#10B981', label: 'Approved' },
}

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? { bg: 'rgba(148,163,184,0.15)', text: '#94A3B8', label: status }
  return (
    <span className="px-2 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: config.bg, color: config.text }}>
      {config.label}
    </span>
  )
}
