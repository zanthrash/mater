import { useRef, useState } from 'react'

interface VoiceNote {
  url: string
  transcript: string | null
  duration_seconds: number
  recorded_at: string
}

interface Props {
  notes: VoiceNote[]
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

export function VoiceNotesCard({ notes }: Props) {
  const [playingIndex, setPlayingIndex] = useState<number | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

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
            <p className="text-xs text-[var(--color-text-primary)] leading-relaxed mb-1.5">
              {note.transcript ?? <span className="text-[var(--color-text-muted)] italic">Transcription pending...</span>}
            </p>
            <div className="flex items-center gap-2">
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
          </div>
        ))}
      </div>
    </div>
  )
}
