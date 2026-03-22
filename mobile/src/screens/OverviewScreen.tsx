import React, { useState } from 'react'
import { View, Text, Button, StyleSheet } from 'react-native'

interface Props {
  onContinue: (overviewUri: string) => void
}

const DUMMY_URI = 'file:///mock/overview_photo.jpg'

export function OverviewScreen({ onContinue }: Props) {
  const [photoUri, setPhotoUri] = useState<string | null>(null)

  return (
    <View style={styles.container}>
      <Text style={styles.title}>New Inspection</Text>
      <Text style={styles.instruction}>Start a new equipment inspection</Text>
      <Text style={styles.photoLabel}>{photoUri ?? 'No photo yet'}</Text>
      <View style={styles.button}>
        <Button
          title="Take Overview Photo"
          onPress={() => setPhotoUri(DUMMY_URI)}
        />
      </View>
      <View style={styles.button}>
        <Button
          title="Continue"
          disabled={photoUri === null}
          onPress={() => {
            if (photoUri !== null) {
              onContinue(photoUri)
            }
          }}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
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
  },
  photoLabel: {
    fontSize: 14,
    marginBottom: 16,
    color: '#333',
  },
  button: {
    marginBottom: 12,
  },
})
