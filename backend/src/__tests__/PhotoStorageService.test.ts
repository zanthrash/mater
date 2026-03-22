import { describe, it, expect, vi } from 'vitest'
import { PhotoStorageService } from '../services/PhotoStorageService.js'
import type { PhotoInput } from '../services/PhotoStorageService.js'

function makeSupabaseMock(opts: { uploadError?: { message: string } | null; publicUrl?: string } = {}) {
  const publicUrl = opts.publicUrl ?? 'https://example.com/photo.jpg'
  const uploadError = opts.uploadError ?? null

  const getPublicUrl = vi.fn().mockReturnValue({ data: { publicUrl } })
  const upload = vi.fn().mockResolvedValue({ error: uploadError, data: null })
  const from = vi.fn().mockReturnValue({ upload, getPublicUrl })

  return {
    storage: { from },
    _mocks: { from, upload, getPublicUrl },
  }
}

describe('PhotoStorageService', () => {
  it('uploadPhotos returns correct { url, type } array', async () => {
    const supabase = makeSupabaseMock({ publicUrl: 'https://cdn.example.com/img.jpg' })
    const service = new PhotoStorageService(supabase as any)

    const photos: PhotoInput[] = [
      { base64: Buffer.from('fake-image-1').toString('base64'), type: 'overview' },
      { base64: Buffer.from('fake-image-2').toString('base64'), type: 'detail' },
    ]

    const result = await service.uploadPhotos('insp-123', photos)

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ url: 'https://cdn.example.com/img.jpg', type: 'overview' })
    expect(result[1]).toEqual({ url: 'https://cdn.example.com/img.jpg', type: 'detail' })
  })

  it('uses path starting with inspectionId/', async () => {
    const supabase = makeSupabaseMock()
    const service = new PhotoStorageService(supabase as any)

    const photos: PhotoInput[] = [
      { base64: Buffer.from('data').toString('base64'), type: 'vin' },
    ]

    await service.uploadPhotos('insp-456', photos)

    const uploadCall = supabase._mocks.upload.mock.calls[0]
    const path = uploadCall[0] as string
    expect(path).toMatch(/^insp-456\//)
    expect(path).toMatch(/^insp-456\/vin-\d+\.jpg$/)
  })

  it('throws on upload error', async () => {
    const supabase = makeSupabaseMock({ uploadError: { message: 'bucket not found' } })
    const service = new PhotoStorageService(supabase as any)

    const photos: PhotoInput[] = [
      { base64: Buffer.from('data').toString('base64'), type: 'overview' },
    ]

    await expect(service.uploadPhotos('insp-789', photos)).rejects.toThrow(
      'Failed to upload photo: bucket not found'
    )
  })
})
