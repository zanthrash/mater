import type { SupabaseClient } from '@supabase/supabase-js'

export interface PhotoInput {
  base64: string
  type: string
}

export interface StoredPhoto {
  url: string
  type: string
}

export class PhotoStorageService {
  constructor(private readonly supabase: SupabaseClient) {}

  async uploadPhotos(inspectionId: string, photos: PhotoInput[]): Promise<StoredPhoto[]> {
    const results: StoredPhoto[] = []

    for (const photo of photos) {
      const timestamp = Date.now()
      const path = `${inspectionId}/${photo.type}-${timestamp}.jpg`
      const buffer = Buffer.from(photo.base64, 'base64')

      const { error } = await this.supabase.storage
        .from('inspection-photos')
        .upload(path, buffer, { contentType: 'image/jpeg' })

      if (error) {
        throw new Error('Failed to upload photo: ' + error.message)
      }

      const { data } = this.supabase.storage
        .from('inspection-photos')
        .getPublicUrl(path)

      results.push({ url: data.publicUrl, type: photo.type })
    }

    return results
  }
}
