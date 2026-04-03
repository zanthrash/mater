import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image } from 'react-native'
import { CameraViewfinder } from '../components/CameraViewfinder'
import { WizardHeader } from '../components/WizardHeader'
import { useThemeColors } from '../theme'
import type { AssetPhoto } from '../state/WizardStateManager'

interface Props {
  photoChecklist: string[]
  photos: AssetPhoto[]
  onPhotosChange: (photos: AssetPhoto[]) => void
  onContinue: () => void
  onBack?: () => void
  onRestart?: () => void
}

const MIN_PHOTOS = 3

export function GuidedPhotosScreen({
  photoChecklist,
  photos,
  onPhotosChange,
  onContinue,
  onBack,
  onRestart,
}: Props) {
  const colors = useThemeColors()
  const [cameraOpen, setCameraOpen] = useState(false)
  const [currentLabel, setCurrentLabel] = useState<string | null>(null)
  const [retakeLabel, setRetakeLabel] = useState<string | null>(null)

  const handleCapturChecklist = (label: string) => {
    setCurrentLabel(label)
    setRetakeLabel(null)
    setCameraOpen(true)
  }

  const handleRetake = (label: string) => {
    setCurrentLabel(label)
    setRetakeLabel(label)
    setCameraOpen(true)
  }

  const handleAddExtra = () => {
    setCurrentLabel(null)
    setRetakeLabel(null)
    setCameraOpen(true)
  }

  const handleCapture = (base64: string) => {
    const uri = `data:image/jpeg;base64,${base64}`
    if (retakeLabel !== null) {
      const updated = photos.map(p =>
        p.label === retakeLabel ? { ...p, uri, base64 } : p
      )
      onPhotosChange(updated)
    } else if (currentLabel !== null) {
      onPhotosChange([...photos, { uri, base64, label: currentLabel, type: 'guided' as const }])
    } else {
      onPhotosChange([...photos, { uri, base64, label: 'Extra', type: 'extra' as const }])
    }
    setCameraOpen(false)
    setCurrentLabel(null)
    setRetakeLabel(null)
  }

  const handleCancelCamera = () => {
    setCameraOpen(false)
    setCurrentLabel(null)
    setRetakeLabel(null)
  }

  const handleDelete = (label: string) => {
    onPhotosChange(photos.filter(p => !(p.type === 'guided' && p.label === label)))
  }

  const handleDeleteExtra = (index: number) => {
    const extraPhotos = photos.filter(p => p.type === 'extra')
    const target = extraPhotos[index]
    const targetIndex = photos.indexOf(target)
    onPhotosChange(photos.filter((_, i) => i !== targetIndex))
  }

  if (cameraOpen) {
    return <CameraViewfinder onCapture={handleCapture} onCancel={handleCancelCamera} />
  }

  const canContinue = photos.length >= MIN_PHOTOS
  const extraPhotos = photos.filter(p => p.type === 'extra')

  return (
    <View style={styles.outerContainer}>
      <WizardHeader
        title="Capture Photos"
        showBack
        onBack={onBack}
        showMenu
        onRestart={onRestart}
      />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.instruction, { color: colors.secondary }]}>
          Capture each required photo. Tap to photograph.
        </Text>

        {photoChecklist.map(item => {
          const captured = photos.find(p => p.type === 'guided' && p.label === item)
          if (captured) {
            const imageUri = captured.uri || `data:image/jpeg;base64,${captured.base64}`
            return (
              <View key={item} style={[styles.row, { borderBottomColor: colors.separator }]}>
                <Text style={[styles.itemLabel, { color: colors.label }]}>{item}</Text>
                <Image
                  source={{ uri: imageUri }}
                  style={[styles.thumbnail, { backgroundColor: colors.surface }]}
                  testID={`thumbnail-${item}`}
                />
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.primary }]}
                  onPress={() => handleRetake(item)}
                  testID={`retake-${item}`}
                >
                  <Text style={styles.actionButtonText}>Retake</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.error }]}
                  onPress={() => handleDelete(item)}
                  testID={`delete-${item}`}
                >
                  <Text style={styles.actionButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            )
          }
          return (
            <View key={item} style={[styles.row, { borderBottomColor: colors.separator }]}>
              <Text style={[styles.itemLabel, { color: colors.label }]}>{item}</Text>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.primary }]}
                onPress={() => handleCapturChecklist(item)}
                testID={`capture-${item}`}
              >
                <Text style={styles.actionButtonText}>📷</Text>
              </TouchableOpacity>
            </View>
          )
        })}

        {extraPhotos.map((photo, index) => {
          const imageUri = photo.uri || `data:image/jpeg;base64,${photo.base64}`
          return (
            <View key={`extra-${index}`} style={[styles.row, { borderBottomColor: colors.separator }]}>
              <Text style={[styles.itemLabel, { color: colors.label }]}>Extra {index + 1}</Text>
              <Image
                source={{ uri: imageUri }}
                style={[styles.thumbnail, { backgroundColor: colors.surface }]}
                testID={`thumbnail-extra-${index}`}
              />
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.error }]}
                onPress={() => handleDeleteExtra(index)}
                testID={`delete-extra-${index}`}
              >
                <Text style={styles.actionButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          )
        })}

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.secondary }]}
          onPress={handleAddExtra}
          testID="add-extra-button"
        >
          <Text style={styles.buttonText}>Add Extra Photo</Text>
        </TouchableOpacity>

        <Text style={[styles.photoCount, { color: colors.label }]}>
          {photos.length} photos captured
        </Text>

        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: canContinue ? colors.success : colors.buttonDisabledBg },
          ]}
          onPress={onContinue}
          disabled={!canContinue}
          testID="continue-button"
        >
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  instruction: {
    fontSize: 16,
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  itemLabel: {
    flex: 1,
    fontSize: 15,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 6,
  },
  actionButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  photoCount: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
  },
})
