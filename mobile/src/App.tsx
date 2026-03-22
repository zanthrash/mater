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

const validScreens: Screen[] = ['overview', 'vin', 'photos', 'result', 'conflict']

const stateManager = new WizardStateManager()

export default function App() {
  const [screen, setScreen] = useState<Screen>('overview')
  const [analysisResult, setAnalysisResult] = useState<AnalyzeImagesResponse | null>(null)
  const [overviewUri, setOverviewUri] = useState<string | null>(null)
  const [vinData, setVinData] = useState<{ vin: string; result: VinResult | null } | null>(null)
  const [resolvedData, setResolvedData] = useState<Record<string, string | number | null> | null>(null)
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
            onPress: async () => {
              const latestDraft = await stateManager.loadDraft()
              if (latestDraft) {
                const targetScreen = validScreens.includes(latestDraft.step as Screen)
                  ? (latestDraft.step as Screen)
                  : 'overview'
                setScreen(targetScreen)
                if (latestDraft.overviewUri) setOverviewUri(latestDraft.overviewUri)
                if (latestDraft.vinResult !== undefined)
                  setVinData(
                    latestDraft.vin
                      ? { vin: latestDraft.vin, result: latestDraft.vinResult ?? null }
                      : null,
                  )
                if (latestDraft.aiResult !== undefined)
                  setAnalysisResult(
                    latestDraft.aiResult
                      ? { storedPhotos: [], analysis: latestDraft.aiResult }
                      : null,
                  )
                if (latestDraft.resolvedData) setResolvedData(latestDraft.resolvedData)
              }
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

  if (screen === 'result') {
    return (
      <AIResultScreen
        analysis={analysisResult?.analysis ?? null}
        onNext={() => {
          stateManager.saveStep('conflict', {
            aiResult: analysisResult?.analysis ?? null,
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
        onResolved={(resolved) => {
          setResolvedData(resolved)
          stateManager.clearDraft()
          Alert.alert('Draft saved', 'Resolved data saved.')
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
