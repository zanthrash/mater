import React, { useState, useRef, useEffect } from 'react'
import { View, Text, ScrollView, StyleSheet, Animated } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useThemeColors, typography } from '../theme'
import { WizardHeader } from '../components/WizardHeader'
import { PrimaryButton } from '../components/PrimaryButton'
import { AIBadge } from '../components/AIBadge'
import { TaxonomyPicker } from '../components/TaxonomyPicker'
import { AiAnalysisBanner } from '../components/AiAnalysisBanner'
import { ChecklistSkeleton } from '../components/ChecklistSkeleton'
import type { ClassificationResult, TaxonomyCategoryNode } from '../services/APIClient'

const CATEGORY_CHECKLISTS: Record<string, string[]> = {
  Earthmoving: ['Front', 'Rear', 'Left Side', 'Right Side', 'Engine Compartment', 'Operator Station', 'Serial Plate'],
  Lifting: ['Front', 'Rear', 'Boom/Arm', 'Hook/Attachment', 'Operator Cab', 'Serial Plate'],
  Trucking: ['Front', 'Rear', 'Driver Side', 'Passenger Side', 'Cargo Area', 'Engine', 'Serial Plate'],
  Aerial: ['Front', 'Rear', 'Platform/Basket', 'Boom Extended', 'Controls', 'Serial Plate'],
  Compaction: ['Front', 'Rear', 'Drum', 'Operator Station', 'Engine', 'Serial Plate'],
  Agriculture: ['Front', 'Rear', 'Left Side', 'Right Side', 'Cab/Operator Station', 'Attachment', 'Serial Plate'],
  Forestry: ['Front', 'Rear', 'Attachment/Head', 'Operator Cab', 'Engine', 'Serial Plate'],
  'Power Generation': ['Front', 'Rear', 'Control Panel', 'Engine/Motor', 'Fuel System', 'Serial Plate'],
  Paving: ['Front', 'Rear', 'Paving Head', 'Hopper', 'Operator Station', 'Serial Plate'],
  Mining: ['Front', 'Rear', 'Left Side', 'Right Side', 'Payload Area', 'Operator Cab', 'Serial Plate'],
  'Marine/Dredging': ['Port Side', 'Starboard Side', 'Bow', 'Stern', 'Deck Equipment', 'Serial Plate'],
}

const DEFAULT_CHECKLIST = ['Front', 'Rear', 'Left Side', 'Right Side', 'Interior', 'Engine', 'Serial Plate']

interface Props {
  classificationResult: ClassificationResult | null
  classificationLoading: boolean
  taxonomyTree: TaxonomyCategoryNode[]
  onConfirm: (taxonomy: { category: string; type: string; subtype: string | null }, checklist: string[]) => void
  onBack?: () => void
  onRestart?: () => void
}

export function TaxonomyValidationScreen({
  classificationResult,
  classificationLoading,
  taxonomyTree,
  onConfirm,
  onBack,
  onRestart,
}: Props) {
  const colors = useThemeColors()
  const [override, setOverride] = useState<{ category: string; type: string; subtype: string | null } | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [revealedCount, setRevealedCount] = useState<number | null>(null)
  const prevResultRef = useRef<ClassificationResult | null>(classificationResult)

  const taxonomy = override ?? (classificationResult
    ? { category: classificationResult.taxonomy.category, type: classificationResult.taxonomy.type, subtype: classificationResult.taxonomy.subtype }
    : null)

  const checklist = override
    ? (CATEGORY_CHECKLISTS[override.category] ?? DEFAULT_CHECKLIST)
    : (classificationResult?.photoChecklist ?? DEFAULT_CHECKLIST)

  const confidence = classificationResult?.taxonomy.confidence ?? 0
  const confidenceColor =
    confidence >= 0.8 ? colors.success : confidence >= 0.5 ? colors.warning : colors.error

  useEffect(() => {
    if (classificationResult && !prevResultRef.current) {
      setRevealedCount(0)
      const items = override
        ? (CATEGORY_CHECKLISTS[override.category] ?? DEFAULT_CHECKLIST)
        : classificationResult.photoChecklist
      let count = 0
      const interval = setInterval(() => {
        count++
        setRevealedCount(count)
        if (count >= items.length) clearInterval(interval)
      }, 60)
      prevResultRef.current = classificationResult
      return () => clearInterval(interval)
    }
    if (classificationResult) {
      prevResultRef.current = classificationResult
    }
  }, [classificationResult])

  const isLoading = classificationLoading && !classificationResult
  const isRevealing = revealedCount !== null && revealedCount < checklist.length

  function handleConfirm() {
    if (!taxonomy) return
    onConfirm(taxonomy, checklist)
  }

  function handlePickerChange(val: { category: string; type: string; subtype: string | null }) {
    setOverride(val)
    setPickerOpen(false)
  }

  const pickerValue = taxonomy ?? { category: '', type: '', subtype: null }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <WizardHeader
        title="Validate Classification"
        showBack
        onBack={onBack}
        showMenu
        onRestart={onRestart}
        stepInfo={{ current: 3, total: 6 }}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {isLoading ? (
          <View testID="taxonomy-validation-skeleton">
            {/* Taxonomy card skeleton */}
            <View style={[styles.skeletonCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {[80, 120, 60].map((w, i) => (
                <View key={i} style={[styles.skeletonRow, { width: w, backgroundColor: colors.borderLight }]} />
              ))}
            </View>

            {/* AI analysis banner */}
            <AiAnalysisBanner message="Analyzing your equipment..." />

            {/* Checklist skeleton */}
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.skeletonRow, { width: 110, backgroundColor: colors.borderLight, marginBottom: 6 }]} />
              <ChecklistSkeleton rows={5} />
            </View>
          </View>
        ) : (
          <>
            {/* Classification card */}
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.sectionLabelRow}>
                <Text style={[typography.label, { color: colors.primary, letterSpacing: 1 }]}>AI CLASSIFICATION</Text>
                <AIBadge />
              </View>

              {taxonomy ? (
                <>
                  <View style={styles.taxonomyRow}>
                    <Text style={[typography.heading, { color: colors.heading }]}>{taxonomy.category}</Text>
                    {taxonomy.type ? (
                      <>
                        <Ionicons name="chevron-forward" size={16} color={colors.secondary} style={styles.sep} />
                        <Text style={[typography.heading, { color: colors.heading }]}>{taxonomy.type}</Text>
                      </>
                    ) : null}
                    {taxonomy.subtype ? (
                      <>
                        <Ionicons name="chevron-forward" size={16} color={colors.secondary} style={styles.sep} />
                        <Text style={[typography.heading, { color: colors.heading }]}>{taxonomy.subtype}</Text>
                      </>
                    ) : null}
                  </View>

                  {!override && (
                    <View style={styles.confidenceRow}>
                      <View style={[styles.confidenceDot, { backgroundColor: confidenceColor }]} />
                      <Text style={[typography.bodySmall, { color: colors.secondary }]}>
                        {Math.round(confidence * 100)}% confident
                      </Text>
                    </View>
                  )}
                </>
              ) : (
                <Text style={[typography.body, { color: colors.secondary }]}>Classification pending…</Text>
              )}
            </View>

            {/* Checklist preview */}
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[typography.label, { color: colors.primary, letterSpacing: 1, marginBottom: 6 }]}>
                PHOTO CHECKLIST
              </Text>
              <Text style={[typography.bodySmall, { color: colors.secondary, marginBottom: 10 }]}>
                Based on this classification, we'll capture:
              </Text>
              {checklist.map((item, index) => {
                if (revealedCount !== null && index >= revealedCount) return null
                return (
                  <View key={item} style={styles.checklistItem}>
                    <Ionicons name="camera-outline" size={14} color={colors.secondary} style={styles.checklistIcon} />
                    <Text style={[typography.body, { color: colors.body }]}>{item}</Text>
                  </View>
                )
              })}
            </View>
          </>
        )}

        <View style={styles.buttons}>
          <PrimaryButton
            testID="confirm-button"
            title="Looks Good"
            onPress={handleConfirm}
            disabled={isLoading || !taxonomy || isRevealing}
            icon="checkmark"
          />
          <PrimaryButton
            testID="change-classification-button"
            title="Change Classification"
            variant="secondary"
            onPress={() => setPickerOpen(true)}
            icon="create-outline"
            style={styles.changeBtn}
            disabled={isLoading}
          />
        </View>
      </ScrollView>

      {/* Controlled picker modal */}
      <TaxonomyPicker
        taxonomyTree={taxonomyTree}
        value={pickerValue}
        onChange={handlePickerChange}
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  card: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  taxonomyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  sep: { marginHorizontal: 4 },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  confidenceDot: { width: 8, height: 8, borderRadius: 4 },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  checklistIcon: { marginRight: 8 },
  skeletonCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    gap: 10,
  },
  skeletonRow: { height: 16, borderRadius: 8, opacity: 0.4 },
  buttons: { marginTop: 8 },
  changeBtn: { marginTop: 12 },
})
