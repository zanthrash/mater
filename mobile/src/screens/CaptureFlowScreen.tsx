import React, { useState, useMemo, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { CameraViewfinder } from '../components/CameraViewfinder'
import { PrimaryButton } from '../components/PrimaryButton'
import { useThemeColors, typography } from '../theme'
import type { AssetPhoto } from '../state/WizardStateManager'

type FlowState = 'camera' | 'interstitial'

export interface CaptureFlowScreenProps {
  checklist: string[]
  photos: AssetPhoto[]
  skippedLabels: string[]
  startFrom: string | null
  onPhotoCapture: (photo: AssetPhoto) => void
  onSkip: (label: string) => void
  onComplete: () => void
  onExit: () => void
}

function buildQueue(
  checklist: string[],
  photos: AssetPhoto[],
  skippedLabels: string[],
  startFrom: string | null
): string[] {
  const capturedLabels = new Set(
    photos.filter(p => p.type === 'guided').map(p => p.label)
  )
  const skippedSet = new Set(skippedLabels)
  const startIndex = startFrom != null ? checklist.indexOf(startFrom) : 0
  if (startIndex < 0) return []
  return checklist.slice(startIndex).filter(item => {
    if (capturedLabels.has(item)) return false
    // When startFrom=null (Start Capturing), skip previously-skipped items
    // When startFrom is a label (user tapped specific Capture), include it
    if (startFrom === null && skippedSet.has(item)) return false
    return true
  })
}

export function CaptureFlowScreen({
  checklist,
  photos,
  skippedLabels,
  startFrom,
  onPhotoCapture,
  onSkip,
  onComplete,
  onExit,
}: CaptureFlowScreenProps) {
  const colors = useThemeColors()
  const insets = useSafeAreaInsets()

  // Queue is intentionally frozen at mount — it represents the items to capture
  // in this flow session. Changes to props during the flow are not expected.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const queue = useMemo(() => buildQueue(checklist, photos, skippedLabels, startFrom), [])

  const [currentIndex, setCurrentIndex] = useState(0)
  const [flowState, setFlowState] = useState<FlowState>('camera')
  const [lastCapturedLabel, setLastCapturedLabel] = useState<string | null>(null)

  const currentLabel = queue[currentIndex] ?? null

  useEffect(() => {
    if (queue.length === 0) {
      onComplete()
    }
    // onComplete is intentionally not in deps — queue is frozen at mount, this fires once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handlePhotoCapture = (base64: string) => {
    if (!currentLabel) return
    const uri = `data:image/jpeg;base64,${base64}`
    onPhotoCapture({ uri, base64, label: currentLabel, type: 'guided' })
    setLastCapturedLabel(currentLabel)
    const nextIndex = currentIndex + 1
    if (nextIndex >= queue.length) {
      onComplete()
    } else {
      setCurrentIndex(nextIndex)
      setFlowState('interstitial')
    }
  }

  const handleSkipFromCamera = () => {
    if (!currentLabel) return
    onSkip(currentLabel)
    const nextIndex = currentIndex + 1
    if (nextIndex >= queue.length) {
      onComplete()
    } else {
      setCurrentIndex(nextIndex)
      // Stay in camera state
    }
  }

  const handleSkipFromInterstitial = () => {
    if (!currentLabel) return
    onSkip(currentLabel)
    const nextIndex = currentIndex + 1
    if (nextIndex >= queue.length) {
      onComplete()
    } else {
      setCurrentIndex(nextIndex)
      setFlowState('camera')
    }
  }

  const handleReady = () => {
    setFlowState('camera')
  }

  const checklistPosition = currentLabel ? checklist.indexOf(currentLabel) + 1 : null

  if (flowState === 'camera') {
    return (
      <View style={styles.container} testID="capture-flow-camera">
        <CameraViewfinder
          onCapture={handlePhotoCapture}
          onCancel={onExit}
          label={currentLabel ?? undefined}
        />
        <View style={[styles.progressStrip, { bottom: 155 + insets.bottom }]}>
          <TouchableOpacity
            onPress={handleSkipFromCamera}
            style={styles.stripButton}
            testID="flow-skip-button"
          >
            <Text style={styles.stripButtonText}>Skip</Text>
          </TouchableOpacity>
          <Text style={styles.progressText}>
            {checklistPosition ?? '?'}/{checklist.length}
          </Text>
          <TouchableOpacity
            onPress={onExit}
            style={styles.stripButton}
            testID="flow-list-button"
          >
            <Ionicons name="list" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  // Interstitial state
  return (
    <View
      style={[styles.interstitialContainer, { backgroundColor: colors.background }]}
      testID="capture-flow-interstitial"
    >
      <View style={styles.interstitialContent}>
        <View style={styles.confirmedRow}>
          <Ionicons name="checkmark-circle" size={32} color={colors.success} />
          <Text style={[styles.confirmedText, { color: colors.success, fontFamily: typography.bodyFamily }]}>
            {lastCapturedLabel} — saved
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.nextSection}>
          <Text style={[styles.nextLabel, { color: colors.secondary, fontFamily: typography.bodyFamily }]}>
            NEXT
          </Text>
          <Text style={[styles.nextItem, { color: colors.label, fontFamily: typography.headingFamily }]}>
            {currentLabel}
          </Text>
          <Text style={[styles.positionText, { color: colors.secondary, fontFamily: typography.bodyFamily }]}>
            {checklistPosition} of {checklist.length}
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.interstitialFooter,
          {
            borderTopColor: colors.border,
            paddingBottom: insets.bottom > 0 ? insets.bottom : 24,
          },
        ]}
      >
        <PrimaryButton
          title="Skip"
          onPress={handleSkipFromInterstitial}
          variant="secondary"
          testID="interstitial-skip-button"
          style={styles.footerButton}
        />
        <PrimaryButton
          title="Ready"
          onPress={handleReady}
          icon="arrow-forward"
          testID="interstitial-ready-button"
          style={styles.footerButton}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  progressStrip: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  stripButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  stripButtonText: {
    color: '#fff',
    ...typography.button,
  },
  progressText: {
    color: 'rgba(255,255,255,0.85)',
    ...typography.bodySmall,
  },
  interstitialContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  interstitialContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 32,
  },
  confirmedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  confirmedText: {
    fontSize: 20,
    lineHeight: 26,
  },
  divider: {
    width: 40,
    height: 2,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 1,
  },
  nextSection: {
    alignItems: 'center',
    gap: 6,
  },
  nextLabel: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.5,
  },
  nextItem: {
    fontSize: 32,
    lineHeight: 40,
    textAlign: 'center',
  },
  positionText: {
    fontSize: 15,
    lineHeight: 20,
  },
  interstitialFooter: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerButton: {
    flex: 1,
  },
})
