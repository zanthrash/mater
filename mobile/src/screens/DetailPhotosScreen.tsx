import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native'
import { APIClient } from '../services/APIClient'

interface Props {
  onAnalysisComplete: (result: any) => void
}

export function DetailPhotosScreen({ onAnalysisComplete }: Props) {
  const [analyzing, setAnalyzing] = useState(false)
  const [photoCount, setPhotoCount] = useState(0)

  const handleTakePhoto = () => {
    // Placeholder: in the real implementation this would open the camera
    setPhotoCount((count) => count + 1)
  }

  const handleAnalyze = async () => {
    setAnalyzing(true)
    try {
      const client = new APIClient()
      const photos = Array.from({ length: photoCount }, () => ({
        base64: '',
        type: 'detail',
        mediaType: 'image/jpeg',
      }))
      const result = await client.analyzeImages({
        inspectionId: 'draft-inspection',
        photos,
      })
      onAnalysisComplete(result)
    } catch (error: any) {
      Alert.alert('Analysis failed', error.message)
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Detail Photos</Text>
      <Text style={styles.instruction}>Take photos of key equipment areas</Text>
      <TouchableOpacity style={styles.button} onPress={handleTakePhoto}>
        <Text style={styles.buttonText}>Take Photo</Text>
      </TouchableOpacity>
      <Text style={styles.photoCount}>{photoCount} photos taken</Text>
      {analyzing ? (
        <ActivityIndicator size="large" />
      ) : (
        <TouchableOpacity
          style={[styles.button, styles.analyzeButton]}
          onPress={handleAnalyze}
          disabled={photoCount === 0}
        >
          <Text style={styles.buttonText}>Analyze Photos</Text>
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
