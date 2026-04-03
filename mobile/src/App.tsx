import React, { useState, useEffect, useRef } from 'react'
import { Alert } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AssetListScreen } from './screens/AssetListScreen'
import { AssetDetailScreen } from './screens/AssetDetailScreen'
import { OverviewScreen } from './screens/OverviewScreen'
import { VINEntryScreen } from './screens/VINEntryScreen'
import { GuidedPhotosScreen } from './screens/GuidedPhotosScreen'
import { ReviewEditScreen } from './screens/ReviewEditScreen'
import { SubmitScreen } from './screens/SubmitScreen'
import { ThemeProvider } from './ThemeContext'
import { WizardStateManager } from './state/WizardStateManager'
import type { AssetPhoto, IntakeDraft } from './state/WizardStateManager'
import { APIClient } from './services/APIClient'
import type { Asset, VinResult, ClassificationResult, AnalysisResult, TaxonomyCategoryNode } from './services/APIClient'
import * as Location from 'expo-location'

type Screen = 'home' | 'asset-detail' | 'overview' | 'vin' | 'guided-photos' | 'review' | 'submit-success'

const stateManager = new WizardStateManager()
const client = new APIClient()

function AppContent() {
  const [screen, setScreen] = useState<Screen>('home')
  const [assets, setAssets] = useState<Asset[]>([])
  const [assetsLoading, setAssetsLoading] = useState(false)
  const [taxonomyTree, setTaxonomyTree] = useState<TaxonomyCategoryNode[]>([])
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [selectedAssetEvents, setSelectedAssetEvents] = useState<any[]>([])

  // Intake wizard state
  const [overviewBase64, setOverviewBase64] = useState<string | null>(null)
  const [vinData, setVinData] = useState<{ vin: string; result: VinResult | null } | null>(null)
  const [classificationResult, setClassificationResult] = useState<ClassificationResult | null>(null)
  const [classificationLoading, setClassificationLoading] = useState(false)
  const [photos, setPhotos] = useState<AssetPhoto[]>([])
  const [aiSpecResult, setAiSpecResult] = useState<AnalysisResult | null>(null)
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false)
  const [aiAnalysisError, setAiAnalysisError] = useState(false)
  const [submitAsset, setSubmitAsset] = useState<Asset | null>(null)
  const [history, setHistory] = useState<Screen[]>([])
  const draftChecked = useRef(false)
  const screenRef = useRef<Screen>('home')

  screenRef.current = screen

  useEffect(() => {
    loadAssets()
    loadTaxonomy()
    checkForDraft()
  }, [])

  async function loadAssets(search?: string) {
    setAssetsLoading(true)
    try {
      const result = await client.listAssets(search ? { search } : undefined)
      setAssets(result.data)
    } catch {
      // silently fail
    } finally {
      setAssetsLoading(false)
    }
  }

  async function loadTaxonomy() {
    try {
      const tree = await client.getTaxonomy()
      setTaxonomyTree(tree)
    } catch {
      // silently fail
    }
  }

  function checkForDraft() {
    if (draftChecked.current) return
    draftChecked.current = true
    stateManager.loadDraft().then((draft) => {
      if (!draft) return
      Alert.alert(
        'Resume Intake?',
        'You have an unfinished intake. Would you like to resume?',
        [
          {
            text: 'Resume',
            onPress: async () => {
              const latestDraft = await stateManager.loadDraft()
              if (latestDraft) {
                if (latestDraft.overviewBase64) setOverviewBase64(latestDraft.overviewBase64)
                if (latestDraft.vin && latestDraft.vinResult !== undefined)
                  setVinData({ vin: latestDraft.vin, result: latestDraft.vinResult ?? null })
                if (latestDraft.classificationResult) setClassificationResult(latestDraft.classificationResult)
                if (latestDraft.photos) setPhotos(latestDraft.photos)
                if (latestDraft.aiSpecResult) setAiSpecResult(latestDraft.aiSpecResult)
                const validSteps: Screen[] = ['home', 'asset-detail', 'overview', 'vin', 'guided-photos', 'review', 'submit-success']
                const target = validSteps.includes(latestDraft.step as Screen) ? (latestDraft.step as Screen) : 'home'
                setScreen(target)
              }
            },
          },
          { text: 'Start New', style: 'cancel' },
        ],
      )
    })
  }

  function resetAll() {
    setOverviewBase64(null)
    setVinData(null)
    setClassificationResult(null)
    setClassificationLoading(false)
    setPhotos([])
    setAiSpecResult(null)
    setAiAnalysisLoading(false)
    setAiAnalysisError(false)
    setSubmitAsset(null)
    setHistory([])
    setScreen('home')
    stateManager.clearDraft()
    loadAssets()
  }

  async function retryAnalysis() {
    setAiAnalysisLoading(true)
    setAiAnalysisError(false)
    try {
      const taxonomy = classificationResult?.taxonomy
        ? {
            category: classificationResult.taxonomy.category,
            type: classificationResult.taxonomy.type,
            subtype: classificationResult.taxonomy.subtype,
          }
        : null
      const allPhotos = photos.map((p) => ({
        base64: p.base64 ?? '',
        type: p.type,
        mediaType: 'image/jpeg' as const,
      }))
      const result = await client.analyzeImages({ photos: allPhotos, taxonomy })
      setAiSpecResult(result)
      stateManager.saveStep('review', { aiSpecResult: result })
    } catch {
      setAiAnalysisError(true)
    } finally {
      setAiAnalysisLoading(false)
    }
  }

  function navigate(s: Screen) {
    setHistory((prev) => [...prev, screenRef.current])
    setScreen(s)
  }

  function goBack() {
    if (history.length === 0) return
    const target = history[history.length - 1]
    // Clear state when going back
    if (target === 'overview' || target === 'home') {
      setVinData(null)
      setClassificationResult(null)
      setClassificationLoading(false)
      setPhotos([])
      setAiSpecResult(null)
      setAiAnalysisLoading(false)
      setAiAnalysisError(false)
    } else if (target === 'vin') {
      setClassificationResult(null)
      setClassificationLoading(false)
      setPhotos([])
      setAiSpecResult(null)
      setAiAnalysisLoading(false)
      setAiAnalysisError(false)
    } else if (target === 'guided-photos') {
      setAiSpecResult(null)
      setAiAnalysisLoading(false)
      setAiAnalysisError(false)
    }
    setHistory((prev) => prev.slice(0, -1))
    setScreen(target)
  }

  if (screen === 'home') {
    return (
      <AssetListScreen
        assets={assets}
        loading={assetsLoading}
        onNewIntake={() => navigate('overview')}
        onAssetPress={async (id) => {
          const asset = assets.find((a) => a.id === id) ?? null
          setSelectedAsset(asset)
          setSelectedAssetEvents([])
          navigate('asset-detail')
        }}
        onSearch={(query) => loadAssets(query)}
      />
    )
  }

  if (screen === 'asset-detail' && selectedAsset) {
    return (
      <AssetDetailScreen
        asset={selectedAsset}
        intakeEvents={selectedAssetEvents}
        onBack={goBack}
      />
    )
  }

  if (screen === 'overview') {
    return (
      <OverviewScreen
        initialPhoto={overviewBase64}
        onPhotoChange={(photo) => setOverviewBase64(photo)}
        onBack={goBack}
        onContinue={(base64) => {
          setOverviewBase64(base64)
          stateManager.saveStep('vin', { overviewBase64: base64 })
          navigate('vin')
          // Fire classification early — gives API the full VIN entry duration to resolve
          setClassificationLoading(true)
          client
            .classifyEquipment([{ base64 }])
            .then((result) => {
              setClassificationResult(result)
              stateManager.saveStep('guided-photos', { classificationResult: result })
            })
            .catch(() => {
              // silently fail — fallback checklist will be used
            })
            .finally(() => {
              setClassificationLoading(false)
            })
        }}
      />
    )
  }

  if (screen === 'vin') {
    return (
      <VINEntryScreen
        onBack={goBack}
        onRestart={resetAll}
        onContinue={async (vin, vinResult) => {
          setVinData({ vin, result: vinResult })
          stateManager.saveStep('guided-photos', { vin, vinResult: vinResult ?? null })
          navigate('guided-photos')
          // Re-classify with VIN for better accuracy only if VIN was provided
          if (vin && vin.trim().length > 0 && overviewBase64) {
            setClassificationLoading(true)
            try {
              const result = await client.classifyEquipment([{ base64: overviewBase64 }], vin)
              setClassificationResult(result)
              stateManager.saveStep('guided-photos', { classificationResult: result })
            } catch {
              // Keep whatever result we already have from the earlier call
            } finally {
              setClassificationLoading(false)
            }
          }
        }}
      />
    )
  }

  if (screen === 'guided-photos') {
    const checklist = classificationResult?.photoChecklist ?? ['Front', 'Rear', 'Left Side', 'Right Side', 'Interior', 'Engine', 'Serial Plate']
    return (
      <GuidedPhotosScreen
        photoChecklist={checklist}
        isChecklistLoading={classificationLoading && !classificationResult}
        photos={photos}
        onPhotosChange={(updated) => {
          setPhotos(updated)
          stateManager.saveStep('guided-photos', { photos: updated })
        }}
        onContinue={async () => {
          navigate('review')
          setAiAnalysisLoading(true)
          setAiAnalysisError(false)
          try {
            const taxonomy = classificationResult?.taxonomy
              ? {
                  category: classificationResult.taxonomy.category,
                  type: classificationResult.taxonomy.type,
                  subtype: classificationResult.taxonomy.subtype,
                }
              : null
            const allPhotos = photos.map((p) => ({
              base64: p.base64 ?? '',
              type: p.type,
              mediaType: 'image/jpeg' as const,
            }))
            const result = await client.analyzeImages({ photos: allPhotos, taxonomy })
            setAiSpecResult(result)
            stateManager.saveStep('review', { aiSpecResult: result })
          } catch {
            setAiAnalysisError(true)
          } finally {
            setAiAnalysisLoading(false)
          }
        }}
        onBack={goBack}
        onRestart={resetAll}
      />
    )
  }

  if (screen === 'review') {
    return (
      <ReviewEditScreen
        taxonomy={classificationResult?.taxonomy ?? { category: '', type: '', subtype: null }}
        coreSpecs={aiSpecResult?.coreSpecs ?? { make: null, model: null, year: null, engineType: null, transmission: null, gvwLbs: null, hoursOnMeter: null }}
        typeSpecificSpecs={aiSpecResult?.typeSpecificSpecs ?? {}}
        vinResult={vinData?.result ?? null}
        photos={photos}
        taxonomyTree={taxonomyTree}
        onSubmit={async (reviewData) => {
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
            // GPS optional
          }

          const result = await client.createAsset({
            vinSerial: vinData?.vin,
            operatorName: undefined,
            gpsLat,
            gpsLon,
            photos: photos.map((p) => ({
              base64: p.base64 ?? '',
              label: p.label,
              type: p.type,
              mediaType: 'image/jpeg',
            })),
            taxonomy: reviewData.taxonomy,
            coreSpecs: reviewData.coreSpecs as Record<string, unknown>,
            typeSpecificSpecs: reviewData.typeSpecificSpecs,
            yardMetadata: reviewData.yardMetadata,
            aiAnalysisResult: aiSpecResult as Record<string, unknown> | null ?? null,
            vinLookupResult: vinData?.result as Record<string, unknown> | null ?? null,
            aiTaxonomyResult: classificationResult as Record<string, unknown> | null ?? null,
          })

          await stateManager.clearDraft()
          setSubmitAsset(result.asset)
          navigate('submit-success')
        }}
        aiLoading={aiAnalysisLoading}
        aiError={aiAnalysisError}
        onRetryAnalysis={retryAnalysis}
        onBack={goBack}
        onRestart={resetAll}
      />
    )
  }

  if (screen === 'submit-success' && submitAsset) {
    return (
      <SubmitScreen
        assetId={submitAsset.id}
        assetSummary={{
          make: submitAsset.make,
          model: submitAsset.model,
          category: submitAsset.category,
          type: submitAsset.type,
        }}
        onStartNew={resetAll}
        onViewInList={() => {
          resetAll()
        }}
      />
    )
  }

  return null
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  )
}
