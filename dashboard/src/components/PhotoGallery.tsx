import { useState } from 'react'
import { PhotoLightbox } from './PhotoLightbox'

interface Photo {
  url: string
  label: string
  type: 'guided' | 'extra'
}

interface PhotoGalleryProps {
  photos: Photo[]
}

export function PhotoGallery({ photos }: PhotoGalleryProps) {
  const [heroIndex, setHeroIndex] = useState(0)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  if (photos.length === 0) return null

  const heroPhoto = photos[heroIndex]
  const thumbnails = photos
    .map((photo, originalIndex) => ({ ...photo, originalIndex }))
    .filter(p => p.originalIndex !== heroIndex)

  return (
    <>
      <div className="bg-[var(--color-surface-card)] rounded-xl p-3.5 border border-[var(--color-border-subtle)]">
        <div className="text-xs font-semibold text-[var(--color-text-primary)] mb-2.5">
          Photos{' '}
          <span className="text-[var(--color-text-muted)] font-normal">({photos.length})</span>
        </div>
        <div className="flex gap-2">
          {/* Hero */}
          <button
            onClick={() => setLightboxIndex(heroIndex)}
            aria-label={`View photo fullscreen: ${heroPhoto.label}`}
            className="flex-[2] bg-[var(--color-surface-primary)] rounded-lg h-40 border-2 border-[var(--color-accent-blue)] relative overflow-hidden cursor-pointer hover:brightness-110 transition-all p-0"
          >
            <img src={heroPhoto.url} alt={heroPhoto.label} className="w-full h-full object-cover" />
            <span className="absolute top-1.5 left-1.5 bg-[var(--color-accent-blue)] text-white px-1.5 py-0.5 rounded text-[8px]">
              Hero
            </span>
          </button>

          {/* Thumbnails */}
          <div className="flex-[3] flex flex-wrap gap-1">
            {thumbnails.map((photo) => (
              <button
                key={photo.originalIndex}
                onClick={() => setHeroIndex(photo.originalIndex)}
                aria-label={`Set as hero: ${photo.label}`}
                className="w-[calc(33.33%-3px)] bg-[var(--color-surface-primary)] rounded-md h-[52px] relative overflow-hidden cursor-pointer hover:ring-2 hover:ring-[var(--color-accent-blue)] transition-all p-0"
              >
                <img src={photo.url} alt={photo.label} className="w-full h-full object-cover" />
                <span className="absolute bottom-0.5 left-1 text-[7px] text-[var(--color-text-secondary)]">
                  {photo.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={photos}
          activeIndex={lightboxIndex}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  )
}
