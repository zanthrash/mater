import React, { useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { DetailPhotosScreen } from './screens/DetailPhotosScreen'
import { AIResultScreen } from './screens/AIResultScreen'
import type { AnalyzeImagesResponse } from './services/APIClient'

type Screen = 'photos' | 'result'

export default function App() {
  const [screen, setScreen] = useState<Screen>('photos')
  const [analysisResult, setAnalysisResult] = useState<AnalyzeImagesResponse | null>(null)

  if (screen === 'result' && analysisResult) {
    return <AIResultScreen analysis={analysisResult.analysis} onNext={() => setScreen('photos')} />
  }

  return (
    <View style={styles.container}>
      <DetailPhotosScreen
        onAnalysisComplete={(result) => {
          setAnalysisResult(result)
          setScreen('result')
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
})
