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

const MIN_PHOTOS = 3

interface Props {
  client?: APIClient
  onAnalysisComplete: (result: AnalyzeImagesResponse) => void
}

export function DetailPhotosScreen({ client = new APIClient(), onAnalysisComplete }: Props) {
  const [analyzing, setAnalyzing] = useState(false)
  const [photos, setPhotos] = useState<string[]>([])
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
      setPhotos((prev) => {
        const updated = [...prev]
        updated[retakeIndex] = base64
        return updated
      })
    } else {
      setPhotos((prev) => [...prev, base64])
    }
    setCameraOpen(false)
    setRetakeIndex(null)
  }

  const handleCancelCamera = () => {
    setCameraOpen(false)
    setRetakeIndex(null)
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
    <View style={styles.container}>
      <Text style={styles.title}>Detail Photos</Text>
      <Text style={styles.instruction}>Take photos of key equipment areas</Text>

      {photos.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.thumbnailRow}
          contentContainerStyle={styles.thumbnailRowContent}
        >
          {photos.map((base64, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => handleThumbnailPress(index)}
              testID={`thumbnail-${index}`}
            >
              <Image
                source={{ uri: `data:image/jpeg;base64,${base64}` }}
                style={styles.thumbnail}
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <TouchableOpacity style={styles.button} onPress={handleAddPhoto} testID="add-photo-button">
        <Text style={styles.buttonText}>Add Photo</Text>
      </TouchableOpacity>

      <Text style={styles.photoCount}>{photos.length} photos taken</Text>

      {analyzing ? (
        <ActivityIndicator size="large" />
      ) : (
        <TouchableOpacity
          style={[styles.button, styles.analyzeButton, !canContinue && styles.disabledButton]}
          onPress={handleAnalyze}
          disabled={!canContinue}
          testID="analyze-button"
        >
          <Text style={styles.buttonText}>
            {canContinue ? 'Analyze Photos' : `Need ${photosNeeded} more photo${photosNeeded === 1 ? '' : 's'}`}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
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
    color: '#555',
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
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginBottom: 16,
  },
  analyzeButton: {
    backgroundColor: '#34C759',
  },
  disabledButton: {
    backgroundColor: '#999',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  photoCount: {
    fontSize: 14,
    color: '#333',
    marginBottom: 16,
  },
})
