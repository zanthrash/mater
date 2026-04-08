import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAssets, useUpdateAsset } from '@/api/hooks'
import { StatusBadge } from '@/components/StatusBadge'
import { ConfidenceBadge } from '@/components/ConfidenceBadge'

interface AssetsSearch {
  status?: string
  category?: string
  search?: string
}

export const Route = createFileRoute('/assets/')({
  validateSearch: (search: Record<string, unknown>): AssetsSearch => ({
    status: search.status as string | undefined,
    category: search.category as string | undefined,
    search: search.search as string | undefined,
  }),
  component: AssetInventory,
})

const statuses = ['all', 'intake', 'needs_review', 'reviewed', 'approved'] as const

function AssetInventory() {
  const { status, category, search: searchParam } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const [page, setPage] = useState(0)
  const [searchText, setSearchText] = useState(searchParam ?? '')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const limit = 20

  const activeStatus = status === 'all' || !status ? undefined : status
  const { data: result } = useAssets({ status: activeStatus, category, search: searchParam, limit, offset: page * limit })
  const updateAsset = useUpdateAsset()

  const assets = result?.data ?? []
  const total = result?.total ?? 0

  const handleBulkStatus = async (newStatus: string) => {
    for (const id of selected) {
      await updateAsset.mutateAsync({ id, updates: { status: newStatus } as any })
    }
    setSelected(new Set())
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--color-border)]">
        <h1 className="text-base font-bold text-[var(--color-text-primary)]">Assets</h1>
        <p className="text-[10px] text-[var(--color-text-muted)]">{total} total</p>
      </div>

      {/* Filters */}
      <div className="px-4 py-2 flex items-center gap-3 border-b border-[var(--color-border)]">
        <div className="flex gap-1">
          {statuses.map((s) => (
            <button key={s} onClick={() => navigate({ search: { status: s === 'all' ? undefined : s, category, search: searchParam } })} className={`text-[10px] px-2.5 py-1 rounded-md ${(s === 'all' && !status) || status === s ? 'bg-[var(--color-surface-card)] text-[var(--color-text-primary)] border border-white/[0.08]' : 'text-[var(--color-text-muted)]'}`}>
              {s === 'all' ? 'All' : s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </button>
          ))}
        </div>
        <input
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && navigate({ search: { status, category, search: searchText || undefined } })}
          placeholder="Search VIN, make, model..."
          className="text-xs bg-[var(--color-surface-input)] border border-white/[0.08] rounded-md px-2.5 py-1.5 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] w-64"
        />
        {selected.size > 0 && (
          <div className="flex gap-1 ml-auto">
            <button onClick={() => handleBulkStatus('reviewed')} className="text-[10px] bg-[var(--color-accent-blue)]/10 text-[var(--color-accent-blue)] px-2.5 py-1 rounded-md border border-[var(--color-accent-blue)]/20">Mark Reviewed ({selected.size})</button>
            <button onClick={() => handleBulkStatus('approved')} className="text-[10px] bg-[var(--color-accent-green)]/10 text-[var(--color-accent-green)] px-2.5 py-1 rounded-md border border-[var(--color-accent-green)]/20">Approve ({selected.size})</button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-4">
        <table className="w-full text-[11px]">
          <thead className="sticky top-0 bg-slate-950">
            <tr className="text-[var(--color-text-muted)] uppercase text-[9px] tracking-wider border-b border-white/[0.04]">
              <th className="py-2 w-8"><input type="checkbox" onChange={(e) => setSelected(e.target.checked ? new Set(assets.map(a => a.id)) : new Set())} /></th>
              <th className="text-left py-2 font-medium">Asset</th>
              <th className="text-left py-2 font-medium">Year</th>
              <th className="text-left py-2 font-medium">Category</th>
              <th className="text-left py-2 font-medium">VIN/Serial</th>
              <th className="text-right py-2 font-medium">Status</th>
              <th className="text-right py-2 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((asset) => (
              <tr key={asset.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] cursor-pointer" onClick={() => navigate({ to: '/assets/$id', params: { id: asset.id } })}>
                <td className="py-2" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={selected.has(asset.id)} onChange={(e) => { const next = new Set(selected); e.target.checked ? next.add(asset.id) : next.delete(asset.id); setSelected(next) }} />
                </td>
                <td className="py-2 font-medium text-[var(--color-text-primary)]">{[asset.make, asset.model].filter(Boolean).join(' ') || 'Unknown'}</td>
                <td className="py-2 text-[var(--color-text-secondary)]">{asset.year ?? '—'}</td>
                <td className="py-2"><span className="bg-[var(--color-accent-blue)]/15 text-[var(--color-accent-blue)] px-1.5 py-0.5 rounded text-[9px]">{asset.category ?? 'Unknown'}</span></td>
                <td className="py-2 text-[var(--color-text-muted)] font-mono text-[10px]">{asset.vin_serial ?? '—'}</td>
                <td className="py-2 text-right"><StatusBadge status={asset.status} /></td>
                <td className="py-2 text-right text-[var(--color-text-muted)]">{new Date(asset.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-4 py-2 border-t border-[var(--color-border)] flex justify-between items-center text-[10px] text-[var(--color-text-muted)]">
        <span>Showing {page * limit + 1}–{Math.min((page + 1) * limit, total)} of {total}</span>
        <div className="flex gap-1">
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="px-2 py-1 rounded bg-[var(--color-surface-card)] disabled:opacity-30">← Prev</button>
          <button disabled={(page + 1) * limit >= total} onClick={() => setPage(p => p + 1)} className="px-2 py-1 rounded bg-[var(--color-surface-card)] disabled:opacity-30">Next →</button>
        </div>
      </div>
    </div>
  )
}
