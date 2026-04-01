import React, { useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native'
import { CameraViewfinder } from '../components/CameraViewfinder'
import { useThemeColors } from '../theme'

interface Props {
  onContinue: (overviewBase64: string) => void
}

export function OverviewScreen({ onContinue }: Props) {
  const colors = useThemeColors()
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
      <Text style={[styles.title, { color: colors.title }]}>New Inspection</Text>
      <Text style={[styles.instruction, { color: colors.secondary }]}>
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
            style={[styles.thumbnail, { backgroundColor: colors.surface }]}
          />
          <Text style={[styles.retakeHint, { color: colors.primary }]}>Tap to retake</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.takePhotoButton, { backgroundColor: colors.primary }]}
          onPress={() => setCameraOpen(true)}
          testID="take-photo-button"
        >
          <Text style={styles.takePhotoButtonText}>Take Overview Photo</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[
          styles.continueButton,
          { backgroundColor: photoBase64 ? colors.success : colors.buttonDisabledBg },
        ]}
        disabled={!photoBase64}
        onPress={() => {
          if (photoBase64) {
            onContinue(photoBase64)
          }
        }}
        testID="continue-button"
      >
        <Text style={[
          styles.continueButtonText,
          !photoBase64 && { color: colors.buttonDisabledText },
        ]}>
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
  },
  retakeHint: {
    fontSize: 13,
    marginTop: 8,
  },
  takePhotoButton: {
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
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 8,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})
