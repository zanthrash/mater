import React, { useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { OverviewScreen } from './screens/OverviewScreen'
import { VINEntryScreen } from './screens/VINEntryScreen'
import { DetailPhotosScreen } from './screens/DetailPhotosScreen'
import { AIResultScreen } from './screens/AIResultScreen'
import type { AnalyzeImagesResponse, VinResult } from './services/APIClient'

type Screen = 'overview' | 'vin' | 'photos' | 'result'

export default function App() {
  const [screen, setScreen] = useState<Screen>('overview')
  const [analysisResult, setAnalysisResult] = useState<AnalyzeImagesResponse | null>(null)

  // vin state kept for future use (e.g. passing to DetailPhotosScreen)
  const [_overviewUri, setOverviewUri] = useState<string | null>(null)
  const [_vinData, setVinData] = useState<{ vin: string; result: VinResult | null } | null>(null)

  if (screen === 'overview') {
    return (
      <OverviewScreen
        onContinue={(overviewUri) => {
          setOverviewUri(overviewUri)
          setScreen('vin')
        }}
      />
    )
  }

  if (screen === 'vin') {
    return (
      <VINEntryScreen
        onContinue={(vin, vinResult) => {
          setVinData({ vin, result: vinResult })
          setScreen('photos')
        }}
      />
    )
  }

  if (screen === 'result' && analysisResult) {
    return (
      <AIResultScreen
        analysis={analysisResult.analysis}
        onNext={() => {
          setOverviewUri(null)
          setVinData(null)
          setAnalysisResult(null)
          setScreen('overview')
        }}
      />
    )
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
