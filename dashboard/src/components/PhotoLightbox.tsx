import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { useFocusTrap } from '@/hooks/useFocusTrap'

interface Photo {
  url: string
  label: string
  type: 'guided' | 'extra'
}

interface PhotoLightboxProps {
  photos: Photo[]
  activeIndex: number
  onIndexChange: (index: number) => void
  onClose: () => void
}

export function PhotoLightbox({ photos, activeIndex, onIndexChange, onClose }: PhotoLightboxProps) {
  const containerRef = useFocusTrap(true)
  const filmstripRef = useRef<HTMLDivElement>(null)
  const activeThumbRef = useRef<HTMLButtonElement>(null)

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && activeIndex > 0) onIndexChange(activeIndex - 1)
      if (e.key === 'ArrowRight' && activeIndex < photos.length - 1) onIndexChange(activeIndex + 1)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeIndex, photos.length, onIndexChange, onClose])

  // Scroll active thumbnail into view
  useEffect(() => {
    activeThumbRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [activeIndex])

  // Preload adjacent images
  useEffect(() => {
    const preload = (idx: number) => {
      if (idx >= 0 && idx < photos.length) {
        const img = new Image()
        img.src = photos[idx].url
      }
    }
    preload(activeIndex - 1)
    preload(activeIndex + 1)
  }, [activeIndex, photos])

  const photo = photos[activeIndex]

  return createPortal(
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      className="fixed inset-0 z-50 bg-black/90 flex flex-col"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <span className="text-sm text-white/60">
          {activeIndex + 1} / {photos.length}
        </span>
        <button
          onClick={onClose}
          aria-label="Close photo viewer"
          className="p-3 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Main image area */}
      <div className="flex-1 flex items-center justify-center relative px-16 min-h-0">
        {/* Prev arrow */}
        <button
          onClick={() => onIndexChange(activeIndex - 1)}
          disabled={activeIndex === 0}
          aria-label="Previous photo"
          className="absolute left-3 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={24} />
        </button>

        {/* Image with crossfade */}
        <div className="flex flex-col items-center gap-3 max-h-full">
          <img
            key={activeIndex}
            src={photo.url}
            alt={photo.label}
            className="max-h-[65vh] max-w-full object-contain rounded-lg animate-fade-in"
          />
          <div className="text-center">
            <p className="text-sm text-white/90">{photo.label}</p>
            <span className="text-xs text-white/40 capitalize">{photo.type}</span>
          </div>
        </div>

        {/* Next arrow */}
        <button
          onClick={() => onIndexChange(activeIndex + 1)}
          disabled={activeIndex === photos.length - 1}
          aria-label="Next photo"
          className="absolute right-3 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
        >
          <ChevronRight size={24} />
        </button>
      </div>

      {/* Filmstrip */}
      <div
        ref={filmstripRef}
        className="shrink-0 flex gap-2 overflow-x-auto px-4 py-3 scrollbar-hide"
        style={{ scrollbarWidth: 'none' }}
      >
        {photos.map((p, i) => (
          <button
            key={i}
            ref={i === activeIndex ? activeThumbRef : null}
            onClick={() => onIndexChange(i)}
            aria-label={`View photo ${i + 1}: ${p.label}`}
            aria-pressed={i === activeIndex}
            className={`shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-all ${
              i === activeIndex
                ? 'border-[var(--color-accent-blue)] opacity-100'
                : 'border-transparent opacity-50 hover:opacity-80'
            }`}
          >
            <img src={p.url} alt={p.label} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
    </div>,
    document.body
  )
}
