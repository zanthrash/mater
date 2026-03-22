import React, { useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native'
import { CameraViewfinder } from '../components/CameraViewfinder'

interface Props {
  onContinue: (overviewBase64: string) => void
}

export function OverviewScreen({ onContinue }: Props) {
  const [photoBase64, setPhotoBase64] = useState<string | null>(null)
  const [cameraOpen, setCameraOpen] = useState(false)

  const handleCapture = useCallback((base64: string) => {
    setPhotoBase64(base64)
    setCameraOpen(false)
  }, [])

  const handleCancel = useCallback(() => {
    setCameraOpen(false)
  }, [])

  if (cameraOpen) {
    return <CameraViewfinder onCapture={handleCapture} onCancel={handleCancel} />
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>New Inspection</Text>
      <Text style={styles.instruction}>
        Take an overview photo of the equipment to begin.
      </Text>

      {photoBase64 ? (
        <TouchableOpacity
          style={styles.thumbnailContainer}
          onPress={() => setCameraOpen(true)}
          testID="overview-thumbnail"
        >
          <Image
            source={{ uri: `data:image/jpeg;base64,${photoBase64}` }}
            style={styles.thumbnail}
          />
          <Text style={styles.retakeHint}>Tap to retake</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.takePhotoButton}
          onPress={() => setCameraOpen(true)}
          testID="take-photo-button"
        >
          <Text style={styles.takePhotoButtonText}>Take Overview Photo</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.continueButton, !photoBase64 && styles.continueButtonDisabled]}
        disabled={!photoBase64}
        onPress={() => {
          if (photoBase64) {
            onContinue(photoBase64)
          }
        }}
        testID="continue-button"
      >
        <Text style={[styles.continueButtonText, !photoBase64 && styles.continueButtonTextDisabled]}>
          Continue
        </Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  instruction: {
    fontSize: 16,
    marginBottom: 24,
    color: '#555',
    textAlign: 'center',
  },
  thumbnailContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  thumbnail: {
    width: 200,
    height: 200,
    borderRadius: 12,
    backgroundColor: '#eee',
  },
  retakeHint: {
    fontSize: 13,
    color: '#007AFF',
    marginTop: 8,
  },
  takePhotoButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginBottom: 24,
  },
  takePhotoButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  continueButton: {
    backgroundColor: '#34C759',
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 8,
  },
  continueButtonDisabled: {
    backgroundColor: '#ccc',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  continueButtonTextDisabled: {
    color: '#999',
  },
})
