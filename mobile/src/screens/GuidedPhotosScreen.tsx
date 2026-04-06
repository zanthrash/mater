import React, { useState, useRef, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, Image, Animated } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { CameraViewfinder } from '../components/CameraViewfinder'
import { ChecklistSkeleton } from '../components/ChecklistSkeleton'
import { CaptureFlowScreen } from './CaptureFlowScreen'
import { WizardHeader } from '../components/WizardHeader'
import { PrimaryButton } from '../components/PrimaryButton'
import { AnimatedPressableButton } from '../components/AnimatedPressable'
import { useThemeColors, typography } from '../theme'
import type { AssetPhoto } from '../state/WizardStateManager'

interface Props {
  photoChecklist: string[]
  isChecklistLoading?: boolean
  photos: AssetPhoto[]
  skippedLabels: string[]
  onPhotosChange: (photos: AssetPhoto[]) => void
  onSkippedLabelsChange: (labels: string[]) => void
  onContinue: () => void
  onBack?: () => void
  onRestart?: () => void
}

const MIN_PHOTOS = 3

// Keyword-based grouping for AI-generated checklists
const CATEGORY_RULES: Array<{ label: string; keywords: string[] }> = [
  {
    label: 'Exterior Views',
    keywords: ['side', 'front', 'rear', 'profile', 'view', 'exterior', 'blade', 'ripper', 'counterweight', 'tail', 'push arm'],
  },
  {
    label: 'Interior & Mechanical',
    keywords: ['cab', 'interior', 'engine', 'hood', 'compartment', 'seat', 'control', 'monitor', 'filter', 'fluid', 'exhaust'],
  },
  {
    label: 'Detail & Documentation',
    keywords: ['undercarriage', 'track', 'sprocket', 'idler', 'roller', 'serial', 'id', 'plate', 'vin', 'grade', 'sensor', 'mast', 'receiver', 'cutting edge', 'wear', 'close'],
  },
]

function groupChecklist(items: string[]): Array<{ label: string; items: string[] }> {
  const groups: Record<string, string[]> = {}
  const ungrouped: string[] = []

  for (const item of items) {
    const lower = item.toLowerCase()
    const match = CATEGORY_RULES.find(rule => rule.keywords.some(kw => lower.includes(kw)))
    if (match) {
      if (!groups[match.label]) groups[match.label] = []
      groups[match.label].push(item)
    } else {
      ungrouped.push(item)
    }
  }

  const result: Array<{ label: string; items: string[] }> = []
  for (const rule of CATEGORY_RULES) {
    if (groups[rule.label]?.length) {
      result.push({ label: rule.label, items: groups[rule.label] })
    }
  }
  if (ungrouped.length) {
    result.push({ label: 'Other', items: ungrouped })
  }

  const groupedCount = result.reduce((sum, g) => sum + g.items.length, 0)
  if (result.length <= 1 || groupedCount < items.length * 0.6) {
    return [{ label: '', items }]
  }
  return result
}


export function GuidedPhotosScreen({
  photoChecklist,
  isChecklistLoading = false,
  photos,
  skippedLabels,
  onPhotosChange,
  onSkippedLabelsChange,
  onContinue,
  onBack,
  onRestart,
}: Props) {
  const colors = useThemeColors()
  const insets = useSafeAreaInsets()
  const [cameraOpen, setCameraOpen] = useState(false)
  const [currentLabel, setCurrentLabel] = useState<string | null>(null)
  const [retakeLabel, setRetakeLabel] = useState<string | null>(null)
  const [captureFlowActive, setCaptureFlowActive] = useState(false)
  const [captureFlowStartLabel, setCaptureFlowStartLabel] = useState<string | null>(null)

  // Single-photo retake (unchanged behavior)
  const handleRetake = (label: string) => {
    setCurrentLabel(label)
    setRetakeLabel(label)
    setCameraOpen(true)
  }

  const handleAddExtra = () => {
    setCurrentLabel(null)
    setRetakeLabel(null)
    setCameraOpen(true)
  }

  const handleCapture = (base64: string) => {
    const uri = `data:image/jpeg;base64,${base64}`
    if (retakeLabel !== null) {
      onPhotosChange(photos.map(p => p.label === retakeLabel ? { ...p, uri, base64 } : p))
    } else {
      onPhotosChange([...photos, { uri, base64, label: 'Extra', type: 'extra' as const }])
    }
    setCameraOpen(false)
    setCurrentLabel(null)
    setRetakeLabel(null)
  }

  const handleCancelCamera = () => {
    setCameraOpen(false)
    setCurrentLabel(null)
    setRetakeLabel(null)
  }

  const handleDelete = (label: string) => {
    onPhotosChange(photos.filter(p => !(p.type === 'guided' && p.label === label)))
  }

  const handleDeleteExtra = (index: number) => {
    const extraPhotos = photos.filter(p => p.type === 'extra')
    const target = extraPhotos[index]
    const targetIndex = photos.indexOf(target)
    onPhotosChange(photos.filter((_, i) => i !== targetIndex))
  }

  // Capture flow entry points
  const handleStartCapturing = () => {
    setCaptureFlowStartLabel(null)
    setCaptureFlowActive(true)
  }

  const handleCaptureChecklist = (label: string) => {
    setCaptureFlowStartLabel(label)
    setCaptureFlowActive(true)
  }

  const handleFlowPhotoCapture = (photo: AssetPhoto) => {
    const exists = photos.some(p => p.type === 'guided' && p.label === photo.label)
    if (exists) {
      onPhotosChange(photos.map(p => (p.type === 'guided' && p.label === photo.label ? photo : p)))
    } else {
      onPhotosChange([...photos, photo])
    }
  }

  const handleFlowSkip = (label: string) => {
    if (!skippedLabels.includes(label)) {
      onSkippedLabelsChange([...skippedLabels, label])
    }
  }

  const handleFlowComplete = () => {
    setCaptureFlowActive(false)
    setCaptureFlowStartLabel(null)
  }

  const handleFlowExit = () => {
    setCaptureFlowActive(false)
    setCaptureFlowStartLabel(null)
  }

  // Retake opens camera directly (single photo, no auto-advance)
  if (cameraOpen) {
    return (
      <CameraViewfinder
        onCapture={handleCapture}
        onCancel={handleCancelCamera}
        label={currentLabel ?? undefined}
      />
    )
  }

  // Capture flow (auto-advance)
  if (captureFlowActive) {
    return (
      <CaptureFlowScreen
        checklist={photoChecklist}
        photos={photos}
        skippedLabels={skippedLabels}
        startFrom={captureFlowStartLabel}
        onPhotoCapture={handleFlowPhotoCapture}
        onSkip={handleFlowSkip}
        onComplete={handleFlowComplete}
        onExit={handleFlowExit}
      />
    )
  }

  const capturedLabels = new Set(photos.filter(p => p.type === 'guided').map(p => p.label))
  const skippedSet = new Set(skippedLabels)
  const canContinue = photos.length >= MIN_PHOTOS
  const extraPhotos = photos.filter(p => p.type === 'extra')
  const guidedCaptured = photos.filter(p => p.type === 'guided').length
  const total = photoChecklist.length
  const groups = groupChecklist(photoChecklist)

  const hasUncapturedUnskipped = photoChecklist.some(
    item => !capturedLabels.has(item) && !skippedSet.has(item)
  )

  let globalIndex = 0

  return (
    <View style={[styles.outerContainer, { backgroundColor: colors.background }]}>
      <WizardHeader
        title="Capture Photos"
        showBack
        onBack={onBack}
        showMenu
        onRestart={onRestart}
        stepInfo={{ current: 4, total: 6 }}
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 16 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header row: instruction + progress fraction */}
        <View style={styles.instructionRow}>
          <Text style={[styles.instruction, { color: colors.secondary, fontFamily: typography.bodyFamily }]}>
            Capture each required photo.
          </Text>
          <View style={[styles.progressPill, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
            <Text style={[styles.progressPillText, { color: guidedCaptured >= total ? colors.success : colors.primary, fontFamily: typography.bodyFamily }]}>
              {guidedCaptured}/{total}
            </Text>
          </View>
        </View>

        {isChecklistLoading ? (
          <View style={[styles.checklistCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <ChecklistSkeleton />
          </View>
        ) : (
          groups.map((group, groupIndex) => (
            <View key={group.label || groupIndex} style={groupIndex > 0 ? { marginTop: 10 } : undefined}>
              {group.label ? (
                <Text style={[styles.sectionHeader, { color: colors.secondary, fontFamily: typography.bodyFamily }]}>
                  {group.label.toUpperCase()}
                </Text>
              ) : null}
              <View style={[styles.checklistCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {group.items.map(item => {
                  const itemNumber = ++globalIndex
                  const captured = photos.find(p => p.type === 'guided' && p.label === item)
                  const isSkipped = skippedSet.has(item)

                  if (captured) {
                    const imageUri = captured.uri || `data:image/jpeg;base64,${captured.base64}`
                    return (
                      <View
                        key={item}
                        style={[
                          styles.row,
                          styles.capturedRow,
                          { borderBottomColor: colors.separator, backgroundColor: colors.surfaceAlt, borderLeftColor: colors.success },
                        ]}
                      >
                        <View style={[styles.numberCircle, { backgroundColor: colors.success }]}>
                          <Ionicons name="checkmark" size={11} color="#fff" />
                        </View>
                        <Text style={[styles.itemLabel, styles.itemLabelCaptured, { color: colors.secondary, fontFamily: typography.bodyFamily }]}>
                          {item}
                        </Text>
                        <View style={styles.thumbnailWrapper}>
                          <Image
                            source={{ uri: imageUri }}
                            style={[styles.thumbnail, { backgroundColor: colors.surface }]}
                            testID={`thumbnail-${item}`}
                          />
                        </View>
                        <AnimatedPressableButton
                          style={[styles.iconButton, { backgroundColor: colors.surface }]}
                          onPress={() => handleRetake(item)}
                          testID={`retake-${item}`}
                        >
                          <Ionicons name="camera-reverse-outline" size={18} color={colors.primary} />
                        </AnimatedPressableButton>
                        <AnimatedPressableButton
                          style={[styles.iconButton, { backgroundColor: colors.errorBg }]}
                          onPress={() => handleDelete(item)}
                          testID={`delete-${item}`}
                        >
                          <Ionicons name="trash-outline" size={18} color={colors.error} />
                        </AnimatedPressableButton>
                      </View>
                    )
                  }

                  return (
                    <View key={item} style={[styles.row, { borderBottomColor: colors.separator }]}>
                      {isSkipped ? (
                        <View style={[styles.skippedBadge, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]} testID={`skipped-badge-${item}`}>
                          <Text style={[styles.skippedBadgeText, { color: colors.secondary, fontFamily: typography.bodyFamily }]}>
                            Skipped
                          </Text>
                        </View>
                      ) : (
                        <View style={[styles.numberCircle, { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }]}>
                          <Text style={[styles.numberText, { color: colors.secondary, fontFamily: typography.bodyFamily }]}>
                            {itemNumber}
                          </Text>
                        </View>
                      )}
                      <Text style={[styles.itemLabel, { color: colors.label, fontFamily: typography.bodyFamily }]}>
                        {item}
                      </Text>
                      <AnimatedPressableButton
                        style={[styles.captureButton, { backgroundColor: isSkipped ? colors.surfaceAlt : colors.primary, borderWidth: isSkipped ? 1 : 0, borderColor: colors.border }]}
                        onPress={() => handleCaptureChecklist(item)}
                        testID={`capture-${item}`}
                      >
                        <Ionicons name="camera" size={16} color={isSkipped ? colors.secondary : colors.onPrimary} />
                        <Text style={[styles.captureButtonText, { color: isSkipped ? colors.secondary : colors.onPrimary, fontFamily: typography.bodyFamily }]}>
                          Capture
                        </Text>
                      </AnimatedPressableButton>
                    </View>
                  )
                })}
              </View>
            </View>
          ))
        )}

        {/* Extra photos section */}
        {extraPhotos.length > 0 && (
          <View style={[styles.checklistCard, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 10 }]}>
            {extraPhotos.map((photo, index) => {
              const imageUri = photo.uri || `data:image/jpeg;base64,${photo.base64}`
              return (
                <View key={`extra-${index}`} style={[styles.row, { borderBottomColor: colors.separator }]}>
                  <Text style={[styles.itemLabel, { color: colors.label, fontFamily: typography.bodyFamily }]}>
                    Extra {index + 1}
                  </Text>
                  <View style={styles.thumbnailWrapper}>
                    <Image
                      source={{ uri: imageUri }}
                      style={[styles.thumbnail, { backgroundColor: colors.surface }]}
                      testID={`thumbnail-extra-${index}`}
                    />
                  </View>
                  <AnimatedPressableButton
                    style={[styles.iconButton, { backgroundColor: colors.errorBg }]}
                    onPress={() => handleDeleteExtra(index)}
                    testID={`delete-extra-${index}`}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.error} />
                  </AnimatedPressableButton>
                </View>
              )
            })}
          </View>
        )}

        <PrimaryButton
          title="Add Extra Photo"
          onPress={handleAddExtra}
          variant="secondary"
          icon="add"
          testID="add-extra-button"
          style={styles.addExtraButton}
        />
      </ScrollView>

      {/* Sticky footer */}
      <View
        style={[
          styles.stickyFooter,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom > 0 ? insets.bottom : 16,
          },
        ]}
      >
        <View style={[styles.countBadge, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
          <Ionicons name="images-outline" size={14} color={colors.secondary} style={{ marginRight: 6 }} />
          <Text style={[styles.countText, { color: colors.secondary, fontFamily: typography.bodyFamily }]}>
            {photos.length} photo{photos.length !== 1 ? 's' : ''} captured
            {!canContinue && ` · need ${MIN_PHOTOS - photos.length} more`}
          </Text>
        </View>
        {hasUncapturedUnskipped && (
          <PrimaryButton
            title="Start Capturing"
            onPress={handleStartCapturing}
            icon="camera"
            testID="start-capturing-button"
          />
        )}
        <PrimaryButton
          title="Continue"
          onPress={onContinue}
          disabled={!canContinue}
          icon="arrow-forward"
          testID="continue-button"
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  instruction: {
    ...typography.body,
    flex: 1,
  },
  progressPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    marginLeft: 8,
  },
  progressPillText: {
    ...typography.bodySmall,
  },
  sectionHeader: {
    ...typography.label,
    marginBottom: 6,
    marginLeft: 2,
  },
  checklistCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  capturedRow: {
    borderLeftWidth: 3,
  },
  numberCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  numberText: {
    ...typography.label,
  },
  itemLabel: {
    flex: 1,
    ...typography.body,
  },
  itemLabelCaptured: {
    ...typography.bodySmall,
  },
  thumbnailWrapper: {
    position: 'relative',
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: 6,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
  },
  captureButtonText: {
    ...typography.bodySmall,
  },
  skippedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    flexShrink: 0,
  },
  skippedBadgeText: {
    ...typography.label,
    fontSize: 11,
  },
  addExtraButton: {
    marginTop: 12,
  },
  stickyFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  countText: {
    ...typography.bodySmall,
  },
})
