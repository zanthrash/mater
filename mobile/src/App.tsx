import React, { useState, useEffect, useRef } from 'react'
import { View, StyleSheet, Alert } from 'react-native'
import { OverviewScreen } from './screens/OverviewScreen'
import { VINEntryScreen } from './screens/VINEntryScreen'
import { DetailPhotosScreen } from './screens/DetailPhotosScreen'
import { AIResultScreen } from './screens/AIResultScreen'
import { ConflictResolutionView } from './screens/ConflictResolutionView'
import { WizardStateManager } from './state/WizardStateManager'
import type { AnalyzeImagesResponse, VinResult } from './services/APIClient'

type Screen = 'overview' | 'vin' | 'photos' | 'result' | 'conflict'

const stateManager = new WizardStateManager()

export default function App() {
  const [screen, setScreen] = useState<Screen>('overview')
  const [analysisResult, setAnalysisResult] = useState<AnalyzeImagesResponse | null>(null)
  const [overviewUri, setOverviewUri] = useState<string | null>(null)
  const [vinData, setVinData] = useState<{ vin: string; result: VinResult | null } | null>(null)
  const draftChecked = useRef(false)

  useEffect(() => {
    if (draftChecked.current) return
    draftChecked.current = true

    stateManager.loadDraft().then((draft) => {
      if (!draft) return
      Alert.alert(
        'Resume?',
        'You have an unfinished inspection. Would you like to resume?',
        [
          {
            text: 'Resume',
            onPress: () => {
              setScreen(draft.step as Screen)
            },
          },
          {
            text: 'Start New',
            style: 'cancel',
          },
        ],
      )
    })
  }, [])

  if (screen === 'overview') {
    return (
      <OverviewScreen
        onContinue={(uri) => {
          setOverviewUri(uri)
          stateManager.saveStep('vin', { overviewUri: uri })
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
          stateManager.saveStep('photos', {
            vin,
            vinResult: vinResult ?? null,
          })
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
          stateManager.saveStep('conflict', {
            aiResult: analysisResult.analysis,
          })
          setScreen('conflict')
        }}
      />
    )
  }

  if (screen === 'conflict') {
    const aiResult = analysisResult?.analysis ?? null
    const vinResult = vinData?.result ?? null
    return (
      <ConflictResolutionView
        aiResult={aiResult}
        vinResult={vinResult}
        onResolved={(resolvedData) => {
          stateManager.saveStep('overview', { resolvedData })
          Alert.alert('Draft saved', 'Resolved data saved.')
          setOverviewUri(null)
          setVinData(null)
          setAnalysisResult(null)
          stateManager.clearDraft()
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
          stateManager.saveStep('result', {
            aiResult: result.analysis,
          })
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
