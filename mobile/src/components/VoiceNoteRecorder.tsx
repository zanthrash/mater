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
  const [expanded, setExpanded] = useState(false)
  const [recording, setRecording] = useState<Audio.Recording | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const soundRef = useRef<Audio.Sound | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    processOfflineQueue()

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') processOfflineQueue()
    })

    return () => {
      sub.remove()
      if (timerRef.current) clearInterval(timerRef.current)
      soundRef.current?.unloadAsync().catch(() => {})
    }
  }, [])

  async function processOfflineQueue() {
    await offlineQueue.processQueue(async (sid, uri, dur) => {
      const note = await uploader.upload(sid, uri, dur)
      if (sid === sessionId) {
        onNotesChange([...notes, note])
      }
    })
  }

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

      // Poll for transcript after a short delay
      setTimeout(async () => {
        try {
          const updated = await uploader.pollTranscription(sessionId)
          onNotesChange(updated)
        } catch {}
      }, 5000)
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
    <View style={[styles.container, { borderColor: colors.border }]}>
      <TouchableOpacity style={styles.header} onPress={() => setExpanded(!expanded)} activeOpacity={0.7}>
        <View style={styles.headerLeft}>
          <Ionicons name="mic-outline" size={16} color={colors.secondary} style={{ marginRight: 6 }} />
          <Text style={[styles.headerText, { color: colors.text, fontFamily: typography.bodyFamily }]}>
            Voice Notes <Text style={{ color: colors.secondary }}>(optional)</Text>
          </Text>
          {notes.length > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Text style={styles.badgeText}>{notes.length}</Text>
            </View>
          )}
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={colors.secondary}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.body}>
          {notes.map((note) => (
            <View key={note.id} style={[styles.noteRow, { borderColor: colors.border }]}>
              <View style={styles.noteInfo}>
                <Text style={[styles.noteDuration, { color: colors.secondary, fontFamily: typography.monoFamily }]}>
                  {formatTime(note.durationSeconds)}
                </Text>
                <Text
                  style={[styles.noteTranscript, { color: colors.text, fontFamily: typography.bodyFamily }]}
                  numberOfLines={2}
                >
                  {note.transcriptionStatus === 'pending' ? 'Transcribing...' : (note.transcript || '—')}
                </Text>
              </View>
              <View style={styles.noteActions}>
                <TouchableOpacity onPress={() => playNote(note)} style={styles.iconBtn}>
                  <Ionicons
                    name={playingId === note.id ? 'pause-circle' : 'play-circle'}
                    size={22}
                    color={colors.primary}
                  />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteNote(note)} style={styles.iconBtn}>
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
              >
                <Ionicons name="stop" size={20} color="#fff" />
                <Text style={styles.recordBtnText}>{formatTime(elapsed)}</Text>
              </TouchableOpacity>
            ) : uploading ? (
              <View style={[styles.recordBtn, { backgroundColor: colors.border }]}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.recordBtnText, { color: colors.secondary }]}>Uploading...</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.recordBtn, { backgroundColor: colors.primary }]}
                onPress={startRecording}
                activeOpacity={0.8}
              >
                <Ionicons name="mic" size={20} color="#fff" />
                <Text style={styles.recordBtnText}>Record Note</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 14,
    fontWeight: '600',
  },
  badge: {
    marginLeft: 8,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
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
    gap: 4,
  },
  iconBtn: {
    padding: 4,
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
