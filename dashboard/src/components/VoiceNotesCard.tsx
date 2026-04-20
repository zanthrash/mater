// dashboard/src/components/VoiceNotesCard.tsx
import { useRef, useState } from 'react'
import { useUpdateAsset } from '@/api/hooks'

interface VoiceNote {
  url: string
  transcript: string | null
  duration_seconds: number
  recorded_at: string
}

interface Props {
  notes: VoiceNote[]
  assetId: string
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const hours = Math.floor(diff / 3_600_000)
  if (hours < 1) return `${Math.floor(diff / 60_000)}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export function VoiceNotesCard({ notes, assetId }: Props) {
  const [playingIndex, setPlayingIndex] = useState<number | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editText, setEditText] = useState('')
  const [confirmDeleteIndex, setConfirmDeleteIndex] = useState<number | null>(null)
  const updateAsset = useUpdateAsset()

  function togglePlay(index: number, url: string) {
    if (playingIndex === index) {
      audioRef.current?.pause()
      setPlayingIndex(null)
      return
    }
    if (audioRef.current) {
      audioRef.current.pause()
    }
    const audio = new Audio(url)
    audioRef.current = audio
    setPlayingIndex(index)
    audio.play()
    audio.onended = () => setPlayingIndex(null)
  }

  function startEdit(index: number, transcript: string | null) {
    setConfirmDeleteIndex(null)
    setEditingIndex(index)
    setEditText(transcript ?? '')
  }

  function cancelEdit() {
    setEditingIndex(null)
    setEditText('')
  }

  async function saveEdit(index: number) {
    const newNotes = notes.map((n, i) =>
      i === index ? { ...n, transcript: editText } : n
    )
    await updateAsset.mutateAsync({ id: assetId, updates: { voice_notes: newNotes } as any })
    setEditingIndex(null)
    setEditText('')
  }

  function startDelete(index: number) {
    setEditingIndex(null)
    setEditText('')
    setConfirmDeleteIndex(index)
  }

  function cancelDelete() {
    setConfirmDeleteIndex(null)
  }

  async function confirmDelete(index: number) {
    const newNotes = notes.filter((_, i) => i !== index)
    await updateAsset.mutateAsync({ id: assetId, updates: { voice_notes: newNotes } as any })
    if (playingIndex === index) {
      audioRef.current?.pause()
      setPlayingIndex(null)
    }
    setConfirmDeleteIndex(null)
  }

  return (
    <div className="bg-[var(--color-surface-card)] rounded-xl p-3.5 border border-[var(--color-border-subtle)]">
      <div className="flex items-center gap-1.5 mb-2.5">
        <svg className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
        <span className="text-xs font-semibold text-[var(--color-text-primary)]">Voice Notes</span>
        <span className="text-[10px] text-[var(--color-text-muted)] ml-auto">{notes.length} note{notes.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="flex flex-col gap-2">
        {notes.map((note, i) => (
          <div key={i} className="bg-[var(--color-surface-primary)] rounded-lg p-2.5">

            {/* Delete confirmation */}
            {confirmDeleteIndex === i ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--color-text-primary)] flex-1">Delete this note?</span>
                <button
                  onClick={() => confirmDelete(i)}
                  disabled={updateAsset.isPending}
                  className="text-[10px] text-[var(--color-accent-red)] hover:opacity-80 disabled:opacity-40 transition-opacity"
                >
                  Yes
                </button>
                <button
                  onClick={cancelDelete}
                  disabled={updateAsset.isPending}
                  className="text-[10px] text-[var(--color-text-muted)] hover:opacity-80 disabled:opacity-40 transition-opacity"
                >
                  No
                </button>
              </div>
            ) : (
              <>
                {/* Transcript row */}
                <div className="flex items-start justify-between gap-1.5 mb-1.5">
                  {editingIndex === i ? (
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="text-xs text-[var(--color-text-primary)] bg-transparent border border-[var(--color-border)] rounded p-1 w-full resize-none leading-relaxed"
                      rows={3}
                      autoFocus
                    />
                  ) : (
                    <p className="text-xs text-[var(--color-text-primary)] leading-relaxed flex-1">
                      {note.transcript ?? (
                        <span className="text-[var(--color-text-muted)] italic">Transcription pending...</span>
                      )}
                    </p>
                  )}
                  {editingIndex !== i && (
                    <button
                      onClick={() => startEdit(i, note.transcript)}
                      className="text-[var(--color-text-muted)] hover:opacity-80 transition-opacity flex-shrink-0"
                      aria-label="Edit transcript"
                    >
                      {/* Pencil icon */}
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Footer row */}
                {editingIndex === i ? (
                  <div className="flex gap-1.5 justify-end">
                    <button
                      onClick={cancelEdit}
                      disabled={updateAsset.isPending}
                      className="text-[10px] text-[var(--color-text-muted)] px-2 py-0.5 rounded border border-[var(--color-border)] disabled:opacity-40"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => saveEdit(i)}
                      disabled={updateAsset.isPending}
                      className="text-[10px] text-white bg-[var(--color-accent-blue)] px-2 py-0.5 rounded disabled:opacity-40"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {/* Trash icon */}
                    <button
                      onClick={() => startDelete(i)}
                      className="text-[var(--color-text-muted)] hover:text-[var(--color-accent-red)] transition-colors"
                      aria-label="Delete note"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                    <span className="text-[9px] font-mono text-[var(--color-text-muted)] bg-[var(--color-surface-card)] px-1.5 py-0.5 rounded">
                      {formatDuration(note.duration_seconds)}
                    </span>
                    <span className="text-[9px] text-[var(--color-text-muted)]">{relativeTime(note.recorded_at)}</span>
                    <button
                      onClick={() => togglePlay(i, note.url)}
                      className="ml-auto flex items-center gap-1 text-[10px] text-[var(--color-accent-blue)] hover:opacity-80 transition-opacity"
                    >
                      {playingIndex === i ? (
                        <>
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                          </svg>
                          Pause
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                          Play
                        </>
                      )}
                    </button>
                  </div>
                )}
              </>
            )}

          </div>
        ))}
      </div>
    </div>
  )
}
