import type { SupabaseClient } from '@supabase/supabase-js'

const BUCKET = 'voice-notes'

export class VoiceNoteStorageService {
  constructor(private readonly supabase: SupabaseClient) {}

  private async ensureBucket(): Promise<void> {
    const { data: buckets } = await this.supabase.storage.listBuckets()
    if (!buckets?.find((b) => b.name === BUCKET)) {
      await this.supabase.storage.createBucket(BUCKET, { public: true })
    }
  }

  async uploadTemp(sessionId: string, audioBuffer: Buffer, durationSeconds: number): Promise<{ tempPath: string; publicUrl: string }> {
    await this.ensureBucket()
    const timestamp = Date.now()
    const tempPath = `temp/${sessionId}/${timestamp}_${durationSeconds}s.m4a`

    const { error } = await this.supabase.storage
      .from(BUCKET)
      .upload(tempPath, audioBuffer, { contentType: 'audio/mp4' })

    if (error) throw new Error('Failed to upload voice note: ' + error.message)

    const { data } = this.supabase.storage.from(BUCKET).getPublicUrl(tempPath)
    return { tempPath, publicUrl: data.publicUrl }
  }

  async moveToAsset(tempPath: string, assetId: string): Promise<string> {
    const filename = tempPath.split('/').pop()!
    const destPath = `${assetId}/${filename}`

    const { data: fileData, error: downloadError } = await this.supabase.storage
      .from(BUCKET)
      .download(tempPath)

    if (downloadError) throw new Error('Failed to download temp voice note: ' + downloadError.message)

    const buffer = Buffer.from(await fileData.arrayBuffer())

    const { error: uploadError } = await this.supabase.storage
      .from(BUCKET)
      .upload(destPath, buffer, { contentType: 'audio/mp4' })

    if (uploadError) throw new Error('Failed to move voice note: ' + uploadError.message)

    await this.supabase.storage.from(BUCKET).remove([tempPath])

    const { data } = this.supabase.storage.from(BUCKET).getPublicUrl(destPath)
    return data.publicUrl
  }

  async cleanupTemp(sessionId: string): Promise<void> {
    const { data: files } = await this.supabase.storage
      .from(BUCKET)
      .list(`temp/${sessionId}`)

    if (files && files.length > 0) {
      const paths = files.map((f) => `temp/${sessionId}/${f.name}`)
      await this.supabase.storage.from(BUCKET).remove(paths)
    }
  }
}
