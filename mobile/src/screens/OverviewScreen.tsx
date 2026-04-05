import React, { useState, useCallback } from 'react'
import { View, Text, Image, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { AnimatedPressableButton } from '../components/AnimatedPressable'
import { PrimaryButton } from '../components/PrimaryButton'
import { CameraViewfinder } from '../components/CameraViewfinder'
import { WizardHeader } from '../components/WizardHeader'
import { useThemeColors, typography } from '../theme'

interface Props {
  initialPhoto?: string | null
  onPhotoChange?: (photo: string | null) => void
  onContinue: (overviewBase64: string) => void
  onBack?: () => void
}

export function OverviewScreen({ initialPhoto, onPhotoChange, onContinue, onBack }: Props) {
  const colors = useThemeColors()
  const [photoBase64, setPhotoBase64] = useState<string | null>(initialPhoto ?? null)
  const [cameraOpen, setCameraOpen] = useState(false)

  const handleCapture = useCallback(
    (base64: string) => {
      setPhotoBase64(base64)
      onPhotoChange?.(base64)
      setCameraOpen(false)
    },
    [onPhotoChange]
  )

  const handleCancel = useCallback(() => {
    setCameraOpen(false)
  }, [])

  if (cameraOpen) {
    return <CameraViewfinder onCapture={handleCapture} onCancel={handleCancel} />
  }

  return (
    <View style={[styles.outer, { backgroundColor: colors.background }]}>
      <WizardHeader
        title="Overview Photo"
        showBack
        onBack={onBack}
        showMenu
        stepInfo={{ current: 1, total: 6 }}
      />
      <View style={styles.container}>
        <Text style={[styles.instruction, { color: colors.secondary, fontFamily: typography.bodyFamily }]}>
          Take an overview photo of the equipment to begin the intake process.
        </Text>

        {photoBase64 ? (
          <View style={styles.thumbnailContainer}>
            <AnimatedPressableButton
              onPress={() => setCameraOpen(true)}
              testID="overview-thumbnail"
            >
              <Image
                source={{ uri: `data:image/jpeg;base64,${photoBase64}` }}
                style={[styles.thumbnail, { borderColor: colors.borderStrong }]}
              />
              <View style={styles.retakeHintRow}>
                <Ionicons name="camera-outline" size={14} color={colors.primary} />
                <Text style={[styles.retakeHint, { color: colors.primary, fontFamily: typography.bodyFamily }]}>
                  Tap to retake
                </Text>
              </View>
            </AnimatedPressableButton>
          </View>
        ) : (
          <View style={[styles.emptyCapture, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Ionicons name="camera-outline" size={64} color={colors.placeholder} style={styles.cameraIcon} />
            <Text style={[styles.emptyCaptureCopy, { color: colors.secondary, fontFamily: typography.bodyFamily }]}>
              No photo yet
            </Text>
          </View>
        )}

        {!photoBase64 && (
          <PrimaryButton
            title="Take Overview Photo"
            onPress={() => setCameraOpen(true)}
            icon="camera"
            testID="take-photo-button"
            style={styles.takePhotoButton}
          />
        )}

        <PrimaryButton
          title="Continue"
          onPress={() => { if (photoBase64) onContinue(photoBase64) }}
          disabled={!photoBase64}
          icon="arrow-forward"
          testID="continue-button"
          style={styles.continueButton}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 32,
    alignItems: 'center',
  },
  instruction: {
    ...typography.body,
    marginBottom: 32,
    textAlign: 'center',
  },
  thumbnailContainer: {
    alignItems: 'center',
    marginBottom: 24,
    gap: 16,
  },
  thumbnail: {
    width: 220,
    height: 220,
    borderRadius: 12,
    borderWidth: 1,
  },
  retakeHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 10,
  },
  retakeHint: {
    ...typography.bodySmall,
  },
  emptyCapture: {
    width: 220,
    height: 220,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  cameraIcon: {
    marginBottom: 8,
  },
  emptyCaptureCopy: {
    ...typography.bodySmall,
  },
  takePhotoButton: {
    alignSelf: 'stretch',
    marginBottom: 12,
  },
  continueButton: {
    alignSelf: 'stretch',
    marginTop: 'auto',
  },
})
