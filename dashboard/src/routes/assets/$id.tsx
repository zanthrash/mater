import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAsset, useIntakeEvents, useUpdateAsset } from '@/api/hooks'
import { StatusBadge } from '@/components/StatusBadge'
import { ConfidenceBadge } from '@/components/ConfidenceBadge'
import { PhotoGallery } from '@/components/PhotoGallery'

export const Route = createFileRoute('/assets/$id')({
  component: AssetDetail,
})

function AssetDetail() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const { data: asset } = useAsset(id)
  const { data: events } = useIntakeEvents(id)
  const updateAsset = useUpdateAsset()
  const [editing, setEditing] = useState(false)
  const [editData, setEditData] = useState<Record<string, unknown>>({})

  if (!asset) return <div className="p-4 text-[var(--color-text-muted)]">Loading...</div>

  const handleSave = async () => {
    await updateAsset.mutateAsync({ id, updates: editData as any })
    setEditing(false)
    setEditData({})
  }

  const aiTax = events?.[0]?.ai_taxonomy_result as Record<string, unknown> | null | undefined
  const taxData = aiTax?.taxonomy as Record<string, unknown> | undefined
  const confidence = typeof taxData?.confidence === 'number' ? taxData.confidence : null

  const coreSpecs = [
    { label: 'Make', value: asset.make },
    { label: 'Model', value: asset.model },
    { label: 'Year', value: asset.year },
    { label: 'Engine', value: asset.engine_type },
    { label: 'GVW', value: asset.gvw_lbs ? `${asset.gvw_lbs.toLocaleString()} lbs` : null },
    { label: 'Hours', value: asset.hours_on_meter?.toLocaleString() },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate({ to: '/assets' })} className="text-[10px] text-[var(--color-accent-blue)]">← Assets</button>
          <span className="text-[10px] text-[var(--color-text-muted)]">/</span>
          <h1 className="text-sm font-bold text-[var(--color-text-primary)]">{[asset.make, asset.model].filter(Boolean).join(' ') || 'Unknown Asset'}</h1>
          <StatusBadge status={asset.status} />
        </div>
        <div className="flex gap-1.5">
          {!editing && (
            <>
              <button onClick={() => updateAsset.mutate({ id, updates: { status: 'needs_review' } as any })} className="text-[10px] text-[var(--color-accent-amber)] bg-[var(--color-accent-amber)]/10 px-3 py-1.5 rounded-md border border-[var(--color-accent-amber)]/20">Flag for Review</button>
              <button onClick={() => { setEditing(true); setEditData({ make: asset.make, model: asset.model, year: asset.year, engine_type: asset.engine_type, gvw_lbs: asset.gvw_lbs, hours_on_meter: asset.hours_on_meter, lot_number: asset.lot_number, yard_location: asset.yard_location, consignor: asset.consignor }) }} className="text-[10px] text-[var(--color-text-primary)] bg-[var(--color-accent-blue)] px-3 py-1.5 rounded-md">Edit Asset</button>
              <button onClick={() => updateAsset.mutate({ id, updates: { status: 'approved' } as any })} className="text-[10px] text-[var(--color-accent-green)] bg-[var(--color-accent-green)]/10 px-3 py-1.5 rounded-md border border-[var(--color-accent-green)]/20">Approve ✓</button>
            </>
          )}
          {editing && (
            <>
              <button onClick={() => setEditing(false)} className="text-[10px] text-[var(--color-text-muted)] px-3 py-1.5 rounded-md border border-[var(--color-border)]">Cancel</button>
              <button onClick={handleSave} className="text-[10px] text-white bg-[var(--color-accent-blue)] px-3 py-1.5 rounded-md">Save</button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 flex gap-4">
        {/* Left: Photos + Specs */}
        <div className="flex-[3] flex flex-col gap-3">
          {/* Photo Gallery */}
          <PhotoGallery photos={asset.photos} />

          {/* Core Specs */}
          <div className="bg-[var(--color-surface-card)] rounded-xl p-3.5 border border-[var(--color-border-subtle)]">
            <div className="flex justify-between items-center mb-2.5">
              <span className="text-xs font-semibold text-[var(--color-text-primary)]">Core Specifications</span>
              {confidence !== null && <span className="text-[9px] text-[var(--color-accent-purple)] bg-[var(--color-accent-purple)]/10 px-2 py-0.5 rounded">🤖 AI Extracted · <ConfidenceBadge value={confidence} /></span>}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {coreSpecs.map(({ label, value }) => (
                <div key={label} className="bg-[var(--color-surface-primary)] rounded-lg p-2.5">
                  <div className="text-[8px] text-[var(--color-text-muted)] uppercase tracking-wider">{label}</div>
                  {editing ? (
                    <input value={String(editData[label.toLowerCase()] ?? value ?? '')} onChange={(e) => setEditData({ ...editData, [label.toLowerCase()]: e.target.value })} className="text-xs text-[var(--color-text-primary)] bg-transparent border-b border-[var(--color-border)] w-full mt-1 outline-none" />
                  ) : (
                    <div className="text-xs text-[var(--color-text-primary)] font-medium mt-0.5">{value ?? '—'}</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Type-Specific Specs */}
          {Object.keys(asset.type_specific_specs).length > 0 && (
            <div className="bg-[var(--color-surface-card)] rounded-xl p-3.5 border border-[var(--color-border-subtle)]">
              <div className="text-xs font-semibold text-[var(--color-text-primary)] mb-2.5">Type-Specific Specs</div>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(asset.type_specific_specs).map(([key, value]) => (
                  <div key={key} className="bg-[var(--color-surface-primary)] rounded-lg p-2.5">
                    <div className="text-[8px] text-[var(--color-text-muted)] uppercase">{key}</div>
                    <div className="text-xs text-[var(--color-text-primary)] mt-0.5">{String(value ?? '—')}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Meta + Timeline */}
        <div className="flex-[2] flex flex-col gap-3">
          {/* Classification */}
          <div className="bg-[var(--color-surface-card)] rounded-xl p-3.5 border border-[var(--color-border-subtle)]">
            <div className="text-xs font-semibold text-[var(--color-text-primary)] mb-2.5">Classification</div>
            <div className="flex gap-1.5 items-center mb-2">
              {[asset.category, asset.type, asset.subtype].filter(Boolean).map((val, i) => (
                <span key={i}>
                  {i > 0 && <span className="text-[var(--color-text-muted)] mr-1.5">→</span>}
                  <span className="bg-[var(--color-accent-blue)]/15 text-[var(--color-accent-blue)] px-2 py-0.5 rounded text-[10px]">{val}</span>
                </span>
              ))}
            </div>
            {confidence !== null && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-[var(--color-text-muted)]">AI Confidence:</span>
                <div className="flex-1 h-1.5 bg-[var(--color-surface-primary)] rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${confidence * 100}%`, backgroundColor: confidence >= 0.8 ? 'var(--color-accent-green)' : confidence >= 0.5 ? 'var(--color-accent-amber)' : 'var(--color-accent-red)' }} />
                </div>
                <ConfidenceBadge value={confidence} />
              </div>
            )}
          </div>

          {/* VIN */}
          <div className="bg-[var(--color-surface-card)] rounded-xl p-3.5 border border-[var(--color-border-subtle)]">
            <div className="text-xs font-semibold text-[var(--color-text-primary)] mb-2">Identification</div>
            <div className="bg-[var(--color-surface-primary)] rounded-lg p-2.5">
              <div className="text-[8px] text-[var(--color-text-muted)] uppercase">VIN / Serial</div>
              <div className="text-sm text-[var(--color-text-primary)] font-medium font-mono mt-0.5">{asset.vin_serial ?? '—'}</div>
            </div>
          </div>

          {/* Yard Info */}
          <div className="bg-[var(--color-surface-card)] rounded-xl p-3.5 border border-[var(--color-border-subtle)]">
            <div className="text-xs font-semibold text-[var(--color-text-primary)] mb-2">Yard Info</div>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="bg-[var(--color-surface-primary)] rounded-lg p-2">
                <div className="text-[8px] text-[var(--color-text-muted)]">Lot #</div>
                <div className="text-xs text-[var(--color-text-primary)] mt-0.5">{editing ? <input value={String(editData.lot_number ?? asset.lot_number ?? '')} onChange={(e) => setEditData({ ...editData, lot_number: e.target.value })} className="bg-transparent border-b border-[var(--color-border)] w-full outline-none" /> : (asset.lot_number ?? '—')}</div>
              </div>
              <div className="bg-[var(--color-surface-primary)] rounded-lg p-2">
                <div className="text-[8px] text-[var(--color-text-muted)]">Location</div>
                <div className="text-xs text-[var(--color-text-primary)] mt-0.5">{editing ? <input value={String(editData.yard_location ?? asset.yard_location ?? '')} onChange={(e) => setEditData({ ...editData, yard_location: e.target.value })} className="bg-transparent border-b border-[var(--color-border)] w-full outline-none" /> : (asset.yard_location ?? '—')}</div>
              </div>
              <div className="bg-[var(--color-surface-primary)] rounded-lg p-2 col-span-2">
                <div className="text-[8px] text-[var(--color-text-muted)]">Consignor</div>
                <div className="text-xs text-[var(--color-text-primary)] mt-0.5">{editing ? <input value={String(editData.consignor ?? asset.consignor ?? '')} onChange={(e) => setEditData({ ...editData, consignor: e.target.value })} className="bg-transparent border-b border-[var(--color-border)] w-full outline-none" /> : (asset.consignor ?? '—')}</div>
              </div>
            </div>
          </div>

          {/* Intake Timeline */}
          <div className="bg-[var(--color-surface-card)] rounded-xl p-3.5 border border-[var(--color-border-subtle)]">
            <div className="text-xs font-semibold text-[var(--color-text-primary)] mb-2.5">Intake History</div>
            <div className="flex flex-col gap-0 relative pl-4">
              <div className="absolute left-[5px] top-1.5 bottom-1.5 w-px bg-[var(--color-border)]" />
              {(events ?? []).map((evt) => (
                <div key={evt.id} className="relative pb-3">
                  <div className="absolute left-[-13px] top-1 w-2 h-2 bg-[var(--color-accent-blue)] rounded-full border-2 border-[var(--color-surface-card)]" />
                  <div className="text-[9px] text-[var(--color-text-muted)]">{new Date(evt.created_at).toLocaleString()}</div>
                  <div className="text-[10px] text-[var(--color-text-primary)] mt-0.5">Submitted by <strong>{evt.operator_name ?? 'Unknown'}</strong></div>
                  {evt.gps_lat && <div className="text-[9px] text-[var(--color-text-muted)] mt-0.5">📍 {evt.gps_lat}°, {evt.gps_lon}°</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
