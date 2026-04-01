import React, { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Image,
} from 'react-native'
import { APIClient, AnalyzeImagesResponse, ServiceError } from '../services/APIClient'
import { CameraViewfinder } from '../components/CameraViewfinder'
import { WizardHeader } from '../components/WizardHeader'
import { useThemeColors } from '../theme'

const MIN_PHOTOS = 3

interface Props {
  client?: APIClient
  photos: string[]
  onPhotosChange: (photos: string[]) => void
  onAnalysisComplete: (result: AnalyzeImagesResponse) => void
  onBack?: () => void
  onRestart?: () => void
}

export function DetailPhotosScreen({
  client = new APIClient(),
  photos,
  onPhotosChange,
  onAnalysisComplete,
  onBack,
  onRestart,
}: Props) {
  const colors = useThemeColors()
  const [analyzing, setAnalyzing] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [retakeIndex, setRetakeIndex] = useState<number | null>(null)

  const handleAddPhoto = () => {
    setRetakeIndex(null)
    setCameraOpen(true)
  }

  const handleThumbnailPress = (index: number) => {
    setRetakeIndex(index)
    setCameraOpen(true)
  }

  const handleCapture = (base64: string) => {
    if (retakeIndex !== null) {
      const updated = [...photos]
      updated[retakeIndex] = base64
      onPhotosChange(updated)
    } else {
      onPhotosChange([...photos, base64])
    }
    setCameraOpen(false)
    setRetakeIndex(null)
  }

  const handleCancelCamera = () => {
    setCameraOpen(false)
    setRetakeIndex(null)
  }

  const handleDeletePhoto = (index: number) => {
    onPhotosChange(photos.filter((_, i) => i !== index))
  }

  const handleAnalyze = async () => {
    setAnalyzing(true)
    try {
      const photoPayload = photos.map((base64) => ({
        base64,
        type: 'detail',
        mediaType: 'image/jpeg',
      }))
      const result = await client.analyzeImages({
        inspectionId: 'draft-inspection',
        photos: photoPayload,
      })
      onAnalysisComplete(result)
    } catch (error) {
      const err = error as ServiceError
      Alert.alert('Analysis failed', err.message)
    } finally {
      setAnalyzing(false)
    }
  }

  if (cameraOpen) {
    return <CameraViewfinder onCapture={handleCapture} onCancel={handleCancelCamera} />
  }

  const photosNeeded = MIN_PHOTOS - photos.length
  const canContinue = photos.length >= MIN_PHOTOS

  return (
    <View style={styles.outerContainer}>
      <WizardHeader title="Detail Photos" showBack onBack={onBack} showMenu onRestart={onRestart} />
      <View style={styles.container}>
      <Text style={[styles.instruction, { color: colors.secondary }]}>
        Take photos of key equipment areas
      </Text>

      {photos.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.thumbnailRow}
          contentContainerStyle={styles.thumbnailRowContent}
        >
          {photos.map((base64, index) => (
            <View key={index} style={styles.thumbnailWrapper}>
              <TouchableOpacity
                onPress={() => handleThumbnailPress(index)}
                testID={`thumbnail-${index}`}
              >
                <Image
                  source={{ uri: `data:image/jpeg;base64,${base64}` }}
                  style={[styles.thumbnail, { backgroundColor: colors.surface }]}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteButton, { backgroundColor: colors.error }]}
                onPress={() => handleDeletePhoto(index)}
                testID={`delete-photo-${index}`}
                accessibilityLabel={`Delete photo ${index + 1}`}
              >
                <Text style={styles.deleteButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.primary }]}
        onPress={handleAddPhoto}
        testID="add-photo-button"
      >
        <Text style={styles.buttonText}>Add Photo</Text>
      </TouchableOpacity>

      <Text style={[styles.photoCount, { color: colors.label }]}>
        {photos.length} photos taken
      </Text>

      {analyzing ? (
        <ActivityIndicator size="large" />
      ) : (
        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: canContinue ? colors.success : colors.buttonDisabledBg },
          ]}
          onPress={handleAnalyze}
          disabled={!canContinue}
          testID="analyze-button"
        >
          <Text style={styles.buttonText}>
            {canContinue
              ? 'Analyze Photos'
              : `Need ${photosNeeded} more photo${photosNeeded === 1 ? '' : 's'}`}
          </Text>
        </TouchableOpacity>
      )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  instruction: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  thumbnailRow: {
    maxHeight: 100,
    marginBottom: 16,
  },
  thumbnailRowContent: {
    paddingHorizontal: 4,
    gap: 8,
  },
  thumbnailWrapper: {
    position: 'relative',
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  deleteButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginBottom: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  photoCount: {
    fontSize: 14,
    marginBottom: 16,
  },
})
