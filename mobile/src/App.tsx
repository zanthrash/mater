import React, { useState, useEffect, useRef } from 'react'
import { View, StyleSheet, Alert } from 'react-native'
import { OverviewScreen } from './screens/OverviewScreen'
import { VINEntryScreen } from './screens/VINEntryScreen'
import { DetailPhotosScreen } from './screens/DetailPhotosScreen'
import { AIResultScreen } from './screens/AIResultScreen'
import { ConflictResolutionView } from './screens/ConflictResolutionView'
import { ConditionAssessmentScreen } from './screens/ConditionAssessmentScreen'
import type { ConditionFormData } from './screens/ConditionAssessmentScreen'
import { ReviewScreen } from './screens/ReviewScreen'
import { SubmitScreen } from './screens/SubmitScreen'
import { WizardStateManager } from './state/WizardStateManager'
import { APIClient } from './services/APIClient'
import type { AnalyzeImagesResponse, VinResult } from './services/APIClient'
import * as Location from 'expo-location'

type Screen = 'overview' | 'vin' | 'photos' | 'result' | 'conflict' | 'condition' | 'review' | 'submit-success'

const validScreens: Screen[] = ['overview', 'vin', 'photos', 'result', 'conflict', 'condition', 'review', 'submit-success']

const stateManager = new WizardStateManager()
const client = new APIClient()

export default function App() {
  const [screen, setScreen] = useState<Screen>('overview')
  const [analysisResult, setAnalysisResult] = useState<AnalyzeImagesResponse | null>(null)
  const [overviewUri, setOverviewUri] = useState<string | null>(null)
  const [vinData, setVinData] = useState<{ vin: string; result: VinResult | null } | null>(null)
  const [resolvedData, setResolvedData] = useState<Record<string, string | number | null> | null>(null)
  const [conditionData, setConditionData] = useState<ConditionFormData | null>(null)
  const [submitResult, setSubmitResult] = useState<{ inspectionId: string; pdfUrl: string } | null>(null)
  const [detailPhotos, setDetailPhotos] = useState<string[]>([])
  const [history, setHistory] = useState<Screen[]>([])
  const draftChecked = useRef(false)
  const screenRef = useRef<Screen>('overview')

  screenRef.current = screen

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

  function resetAll() {
    setOverviewUri(null)
    setVinData(null)
    setAnalysisResult(null)
    setResolvedData(null)
    setConditionData(null)
    setSubmitResult(null)
    setDetailPhotos([])
    setHistory([])
    setScreen('overview')
    stateManager.clearDraft()
  }

  function navigate(s: Screen) {
    setHistory((prev) => [...prev, screenRef.current])
    setScreen(s)
  }

  function goBack() {
    if (history.length === 0) return
    const target = history[history.length - 1]

    if (['conflict', 'result', 'photos', 'vin', 'overview'].includes(target)) {
      setConditionData(null)
    }
    if (['result', 'photos', 'vin', 'overview'].includes(target)) {
      setResolvedData(null)
    }
    if (['photos', 'vin', 'overview'].includes(target)) {
      setAnalysisResult(null)
    }
    if (target === 'overview') {
      setVinData(null)
      setOverviewUri(null)
    }

    setHistory((prev) => prev.slice(0, -1))
    setScreen(target)
  }

  if (screen === 'overview') {
    return (
      <OverviewScreen
        onContinue={(uri) => {
          setOverviewUri(uri)
          stateManager.saveStep('vin', { overviewUri: uri })
          navigate('vin')
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
          navigate('photos')
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
          navigate('conflict')
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
          navigate('condition')
        }}
      />
    )
  }

  if (screen === 'condition') {
    const conditionSummary = analysisResult?.analysis?.conditionSummary ?? null
    return (
      <ConditionAssessmentScreen
        conditionSummary={conditionSummary}
        onContinue={(data) => {
          setConditionData(data)
          navigate('review')
        }}
      />
    )
  }

  if (screen === 'review') {
    const photoCount = detailPhotos.length
    return (
      <ReviewScreen
        equipmentData={resolvedData as Record<string, unknown> | null}
        conditionData={conditionData}
        photoCount={photoCount}
        onSubmit={async (inspectorName) => {
          let gpsLat: number | undefined
          let gpsLon: number | undefined
          try {
            const { status } = await Location.requestForegroundPermissionsAsync()
            if (status === 'granted') {
              const location = await Location.getCurrentPositionAsync({})
              gpsLat = location.coords.latitude
              gpsLon = location.coords.longitude
            }
          } catch {
            // GPS optional — continue without it
          }

          try {
            const result = await client.submitInspection({
              inspectorName,
              gpsLat,
              gpsLon,
              photos: [],
              equipmentData: (resolvedData as Record<string, unknown>) ?? {},
              conditionData: conditionData,
              aiImageResult: (analysisResult?.analysis as Record<string, unknown> | null) ?? null,
              vinLookupResult: (vinData?.result as Record<string, unknown> | null) ?? null,
            })
            await stateManager.clearDraft()
            setSubmitResult(result)
            navigate('submit-success')
          } catch (error) {
            const err = error as { message?: string }
            Alert.alert('Submit failed', err.message ?? 'Unknown error')
          }
        }}
      />
    )
  }

  if (screen === 'submit-success' && submitResult) {
    return (
      <SubmitScreen
        inspectionId={submitResult.inspectionId}
        pdfUrl={submitResult.pdfUrl}
        onStartNew={resetAll}
      />
    )
  }

  if (screen === 'photos') {
    return (
      <View style={styles.container}>
        <DetailPhotosScreen
          photos={detailPhotos}
          onPhotosChange={setDetailPhotos}
          onAnalysisComplete={(result) => {
            setAnalysisResult(result)
            stateManager.saveStep('result', {
              aiResult: result.analysis,
            })
            navigate('result')
          }}
        />
      </View>
    )
  }

  return null
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
})
