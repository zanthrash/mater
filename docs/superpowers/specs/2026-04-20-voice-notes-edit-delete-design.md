# Voice Notes Edit & Delete — Dashboard

**Date:** 2026-04-20
**Status:** Approved

## Summary

Add inline transcript editing and note deletion to `VoiceNotesCard` in the dashboard asset detail page. No backend changes required.

## Context

Voice notes are finalized as a JSONB array (`voice_notes`) on the `assets` table when an asset is submitted. The existing `PUT /api/assets/:id` endpoint (used by `useUpdateAsset`) accepts partial updates including `voice_notes`, so the full array can be replaced to edit or remove individual notes. Individual notes have no IDs — they are addressed by array index.

## Scope

- **Edit:** inline transcript correction per note
- **Delete:** per-note deletion with inline confirmation
- **No backend changes**
- **No new hooks**
- **No new files**

## Architecture

### Approach

Reuse `useUpdateAsset` hook inside `VoiceNotesCard`. The component becomes self-contained for mutations by accepting `assetId` as a new prop.

### Files changed

| File | Change |
|------|--------|
| `dashboard/src/components/VoiceNotesCard.tsx` | Add edit/delete UI + mutation logic |
| `dashboard/src/routes/assets/$id.tsx` | Pass `assetId={id}` to `VoiceNotesCard` |

## Component Design — VoiceNotesCard

### New prop

```ts
interface Props {
  notes: VoiceNote[]
  assetId: string   // added
}
```

### New state

```ts
const [editingIndex, setEditingIndex] = useState<number | null>(null)
const [editText, setEditText] = useState('')
const [confirmDeleteIndex, setConfirmDeleteIndex] = useState<number | null>(null)
```

### Shared mutation helper

```ts
const updateAsset = useUpdateAsset()

async function updateNotes(newNotes: VoiceNote[]) {
  await updateAsset.mutateAsync({ id: assetId, updates: { voice_notes: newNotes } as any })
  setEditingIndex(null)
  setEditText('')
  setConfirmDeleteIndex(null)
}
```

### Edit flow

1. A pencil icon button sits in the top-right of each note card.
2. Click → `setEditingIndex(i)`, `setEditText(note.transcript ?? '')`.
3. Transcript `<p>` is replaced by a `<textarea>` pre-filled with `editText`.
4. Save button calls `updateNotes` with the array copy where `notes[i].transcript = editText`.
5. Cancel clears `editingIndex` and `editText`.
6. Buttons are disabled while `updateAsset.isPending`.

### Delete flow

1. A trash icon button sits in the footer row of each note (left of Play).
2. Click → `setConfirmDeleteIndex(i)`.
3. Note card body is replaced by "Delete this note?" + **Yes** / **No** buttons.
4. Yes calls `updateNotes` with `notes.filter((_, idx) => idx !== i)`.
5. No clears `confirmDeleteIndex`.
6. Yes button is disabled while `updateAsset.isPending`.

### Interaction constraints

- Only one note can be in edit mode at a time (entering edit on a new note cancels the previous).
- Edit mode and delete confirm cannot be open simultaneously on the same note.
- Audio playback is not interrupted when entering edit or delete confirm mode.

## Data Flow

```
User action (edit/delete)
  → local state update (editingIndex / confirmDeleteIndex)
  → user confirms (Save / Yes)
  → build new voice_notes array (splice transcript or filter index)
  → useUpdateAsset.mutateAsync({ id: assetId, updates: { voice_notes: newArray } })
  → PUT /api/assets/:id
  → AssetRepository.update() — replaces voice_notes JSONB column
  → React Query invalidates ['assets', id] → useAsset refetches
  → VoiceNotesCard re-renders with updated notes prop
```

## Error Handling

- On mutation error, state is not cleared (user can retry).
- No toast/notification required for this iteration — the component re-renders with the correct data on success, which is sufficient feedback.

## Out of Scope

- Adding new voice notes from the dashboard
- Re-transcribing notes via Claude
- Editing note audio
- Reordering notes
