import React, { useState, useRef, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, AppState } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Audio } from 'expo-av'
import { useThemeColors, typography } from '../theme'
import type { PendingVoiceNote } from '../services/VoiceNoteUploader'
import { VoiceNoteUploader } from '../services/VoiceNoteUploader'
import { offlineQueue } from '../services/OfflineVoiceNoteQueue'

const MAX_DURATION_SECONDS = 60
const uploader = new VoiceNoteUploader()

interface Props {
  sessionId: string
  notes: PendingVoiceNote[]
  onNotesChange: (notes: PendingVoiceNote[]) => void
}

export function VoiceNoteRecorder({ sessionId, notes, onNotesChange }: Props) {
  const colors = useThemeColors()
  const [recording, setRecording] = useState<Audio.Recording | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const soundRef = useRef<Audio.Sound | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const processOfflineQueueRef = useRef<() => Promise<void>>()
  processOfflineQueueRef.current = async function processOfflineQueue() {
    await offlineQueue.processQueue(async (sid, uri, dur) => {
      const note = await uploader.upload(sid, uri, dur)
      if (sid === sessionId) {
        onNotesChange([...notes, note])
      }
    })
  }

  useEffect(() => {
    processOfflineQueueRef.current?.()

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') processOfflineQueueRef.current?.()
    })

    return () => {
      sub.remove()
      if (timerRef.current) clearInterval(timerRef.current)
      soundRef.current?.unloadAsync().catch(() => {})
    }
  }, [])

  async function startRecording() {
    try {
      const { status } = await Audio.requestPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Microphone access is needed to record voice notes.')
        return
      }

      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true })

      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      )

      setRecording(rec)
      setElapsed(0)

      timerRef.current = setInterval(() => {
        setElapsed((e) => {
          if (e + 1 >= MAX_DURATION_SECONDS) {
            stopRecording(rec)
            return MAX_DURATION_SECONDS
          }
          return e + 1
        })
      }, 1000)
    } catch {
      Alert.alert('Error', 'Could not start recording.')
    }
  }

  async function stopRecording(rec?: Audio.Recording) {
    const activeRec = rec ?? recording
    if (!activeRec) return

    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    const durationSeconds = elapsed || 1
    setRecording(null)

    let uri: string | null = null
    try {
      await activeRec.stopAndUnloadAsync()
      uri = activeRec.getURI() ?? null
      if (!uri) return

      setUploading(true)
      const note = await uploader.upload(sessionId, uri, durationSeconds)
      onNotesChange([...notes, note])

      ;(async () => {
        for (let i = 0; i < 8; i++) {
          await new Promise(r => setTimeout(r, 2000))
          try {
            const updated = await uploader.pollTranscription(sessionId)
            onNotesChange(updated)
            if (updated.every(n => n.transcriptionStatus !== 'pending')) break
          } catch {}
        }
      })()
    } catch {
      if (uri) {
        await offlineQueue.enqueue({
          sessionId,
          fileUri: uri,
          durationSeconds,
          queuedAt: new Date().toISOString(),
        })
      }
    } finally {
      setUploading(false)
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false })
    }
  }

  async function playNote(note: PendingVoiceNote) {
    if (playingId === note.id) {
      await soundRef.current?.stopAsync()
      setPlayingId(null)
      return
    }

    await soundRef.current?.unloadAsync()
    const { sound } = await Audio.Sound.createAsync({ uri: note.publicUrl })
    soundRef.current = sound
    setPlayingId(note.id)
    await sound.playAsync()
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        setPlayingId(null)
      }
    })
  }

  async function deleteNote(note: PendingVoiceNote) {
    if (playingId === note.id) {
      await soundRef.current?.stopAsync()
      await soundRef.current?.unloadAsync().catch(() => {})
      soundRef.current = null
      setPlayingId(null)
    }
    try {
      await uploader.deleteNote(note.id)
      onNotesChange(notes.filter((n) => n.id !== note.id))
    } catch {
      Alert.alert('Error', 'Could not delete voice note.')
    }
  }

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  return (
    <View style={[styles.container, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        <Ionicons name="mic" size={14} color={colors.primary} style={{ marginRight: 6 }} />
        <Text style={[styles.sectionLabel, { color: colors.primary, fontFamily: typography.headingFamily }]}>
          VOICE NOTES
        </Text>
        <Text style={[styles.sectionOptional, { color: colors.secondary, fontFamily: typography.bodyFamily }]}>
          {' (optional)'}
        </Text>
        {notes.length > 0 && (
          <Text style={[styles.noteCount, { color: colors.secondary, fontFamily: typography.monoFamily }]}>
            {'  ·  '}{notes.length} recorded
          </Text>
        )}
      </View>

      <View style={styles.body}>
        {notes.map((note) => (
          <View key={note.id} style={[styles.noteRow, { borderColor: colors.border, backgroundColor: colors.inputBg }]}>
            <View style={styles.noteInfo}>
              <Text style={[styles.noteDuration, { color: colors.secondary, fontFamily: typography.monoFamily }]}>
                {formatTime(note.durationSeconds)}
              </Text>
              <Text
                style={[styles.noteTranscript, { color: colors.body, fontFamily: typography.bodyFamily }]}

              >
                {note.transcriptionStatus === 'pending' ? 'Transcribing...' : (note.transcript || '—')}
              </Text>
            </View>
            <View style={styles.noteActions}>
              <TouchableOpacity
                onPress={() => playNote(note)}
                style={styles.iconBtn}
                accessibilityLabel={playingId === note.id ? 'Pause voice note' : 'Play voice note'}
              >
                <Ionicons
                  name={playingId === note.id ? 'pause-circle' : 'play-circle'}
                  size={22}
                  color={colors.primary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => deleteNote(note)}
                style={styles.iconBtn}
                accessibilityLabel="Delete voice note"
              >
                <Ionicons name="trash-outline" size={18} color={colors.error} />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <View style={styles.controls}>
          {recording ? (
            <TouchableOpacity
              style={[styles.recordBtn, styles.recordingBtn]}
              onPress={() => stopRecording()}
              activeOpacity={0.8}
              accessibilityLabel="Stop recording"
            >
              <Ionicons name="stop" size={20} color="#fff" />
              <Text style={styles.recordBtnText}>{formatTime(elapsed)}</Text>
            </TouchableOpacity>
          ) : uploading ? (
            <View style={[styles.recordBtn, { backgroundColor: colors.inputBg }]}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.recordBtnText, { color: colors.text }]}>Uploading...</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.recordBtn, { backgroundColor: colors.primary }]}
              onPress={startRecording}
              activeOpacity={0.8}
              accessibilityLabel="Start recording voice note"
            >
              <Ionicons name="mic" size={20} color="#fff" />
              <Text style={styles.recordBtnText}>Record Note</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  sectionOptional: {
    fontSize: 12,
  },
  noteCount: {
    fontSize: 12,
  },
  body: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 8,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
  },
  noteInfo: {
    flex: 1,
    gap: 2,
  },
  noteDuration: {
    fontSize: 11,
  },
  noteTranscript: {
    fontSize: 13,
  },
  noteActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controls: {
    marginTop: 4,
  },
  recordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 12,
    gap: 8,
  },
  recordingBtn: {
    backgroundColor: '#EF4444',
  },
  recordBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
})
