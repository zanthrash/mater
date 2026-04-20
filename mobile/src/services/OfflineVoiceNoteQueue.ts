import AsyncStorage from '@react-native-async-storage/async-storage'
import * as FileSystem from 'expo-file-system/legacy'

const QUEUE_KEY = 'voice_note_offline_queue'

export interface QueuedVoiceNote {
  sessionId: string
  fileUri: string
  durationSeconds: number
  queuedAt: string
}

export class OfflineVoiceNoteQueue {
  async enqueue(item: QueuedVoiceNote): Promise<void> {
    const current = await this.getAll()
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify([...current, item]))
  }

  async getAll(): Promise<QueuedVoiceNote[]> {
    const raw = await AsyncStorage.getItem(QUEUE_KEY)
    return raw ? (JSON.parse(raw) as QueuedVoiceNote[]) : []
  }

  async dequeue(fileUri: string): Promise<void> {
    const current = await this.getAll()
    await AsyncStorage.setItem(
      QUEUE_KEY,
      JSON.stringify(current.filter((item) => item.fileUri !== fileUri))
    )
  }

  async processQueue(
    upload: (sessionId: string, fileUri: string, durationSeconds: number) => Promise<unknown>
  ): Promise<void> {
    const items = await this.getAll()
    for (const item of items) {
      const info = await FileSystem.getInfoAsync(item.fileUri)
      if (!info.exists) {
        await this.dequeue(item.fileUri)
        continue
      }
      try {
        await upload(item.sessionId, item.fileUri, item.durationSeconds)
        await this.dequeue(item.fileUri)
      } catch {
        // leave in queue for next retry
      }
    }
  }
}

export const offlineQueue = new OfflineVoiceNoteQueue()
