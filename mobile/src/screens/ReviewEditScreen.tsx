import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Animated,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useThemeColors, typography } from '../theme'
import { WizardHeader } from '../components/WizardHeader'
import { AIBadge } from '../components/AIBadge'
import { PrimaryButton } from '../components/PrimaryButton'
import { SpecRow } from '../components/SpecRow'
import { camelToTitle, titleToCamel } from '../utils/formatting'

// ── Types ──────────────────────────────────────────────────────────────────────

interface AssetPhoto {
  uri: string
  base64?: string
  label: string
  type: 'guided' | 'extra'
}

interface CoreSpecs {
  make: string | null
  model: string | null
  year: number | null
  engineType: string | null
  transmission: string | null
  gvwLbs: number | null
  hoursOnMeter: number | null
}

interface VinResult {
  make: string | null
  model: string | null
  year: number | null
  engineType: string | null
  transmission: string | null
  gvwLbs: number | null
  source: 'nhtsa' | 'claude'
}

interface TaxonomyTypeNode {
  type: string
  subtypes: string[]
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface TaxonomyCategoryNode {
  category: string
  types: TaxonomyTypeNode[]
}

export interface ReviewSubmitData {
  taxonomy: { category: string; type: string; subtype: string | null }
  coreSpecs: CoreSpecs
  typeSpecificSpecs: Record<string, string | number | null>
  yardMetadata: { lotNumber: string; yardLocation: string; consignor: string }
}

interface Props {
  taxonomy: { category: string; type: string; subtype: string | null }
  coreSpecs: CoreSpecs
  typeSpecificSpecs: Record<string, string | number | null>
  vinResult: VinResult | null
  photos: AssetPhoto[]
  taxonomyTree: TaxonomyCategoryNode[]
  yardMetadata?: { lotNumber?: string; yardLocation?: string; consignor?: string }
  onSubmit: (data: ReviewSubmitData) => Promise<void>
  onBack?: () => void
  onRestart?: () => void
  aiLoading: boolean
  aiError: boolean
  onRetryAnalysis?: () => void
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function hasConflict(
  aiValue: string | number | null | undefined,
  vinValue: string | number | null | undefined,
): boolean {
  if (aiValue == null || vinValue == null) return false
  return String(aiValue).toLowerCase().trim() !== String(vinValue).toLowerCase().trim()
}

const CORE_SPEC_KEYS = ['make', 'model', 'year', 'engineType', 'transmission', 'gvwLbs', 'hoursOnMeter'] as const

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  const colors = useThemeColors()
  return (
    <Text style={[styles.sectionHeader, { color: colors.primary, fontFamily: typography.headingFamily }]}>
      {title.toUpperCase()}
    </Text>
  )
}

function FieldLabel({
  label,
  isAiPopulated,
  badgeTestID,
}: {
  label: string
  isAiPopulated?: boolean
  badgeTestID?: string
}) {
  const colors = useThemeColors()
  return (
    <View style={styles.fieldLabelRow}>
      <Text style={[styles.fieldLabel, { color: colors.secondary, fontFamily: typography.bodyFamily }]}>
        {label.toUpperCase()}
      </Text>
      {isAiPopulated && <AIBadge />}
    </View>
  )
}

const SHIMMER_WIDTHS = ['100%', '75%', '60%'] as const

function ShimmerRows({ testID }: { testID: string }) {
  const colors = useThemeColors()
  const shimmer = useRef(new Animated.Value(0.4)).current

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    )
    animation.start()
    return () => animation.stop()
  }, [])

  return (
    <View testID={testID}>
      {SHIMMER_WIDTHS.map((width, i) => (
        <Animated.View
          key={i}
          style={[styles.shimmerRow, { backgroundColor: colors.surface, width }, { opacity: shimmer }]}
        />
      ))}
    </View>
  )
}

function AiAnalysisBanner() {
  const colors = useThemeColors()
  const pulse = useRef(new Animated.Value(0.6)).current

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.6, duration: 900, useNativeDriver: true }),
      ])
    )
    animation.start()
    return () => animation.stop()
  }, [])

  return (
    <Animated.View
      style={[
        styles.aiBanner,
        { backgroundColor: colors.surfaceAlt, borderLeftColor: colors.primary, opacity: pulse },
      ]}
      testID="ai-analysis-banner"
    >
      <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 8 }} />
      <Text style={[styles.aiBannerText, { color: colors.primary, fontFamily: typography.bodyFamily }]}>
        AI is analyzing your photos...
      </Text>
    </Animated.View>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function ReviewEditScreen({
  taxonomy,
  coreSpecs,
  typeSpecificSpecs,
  vinResult,
  photos,
  yardMetadata,
  onSubmit,
  onBack,
  onRestart,
  aiLoading,
  aiError,
  onRetryAnalysis,
}: Props) {
  const colors = useThemeColors()

  const manuallyEditedFields = useRef<Set<string>>(new Set())

  const [editedTaxonomy, setEditedTaxonomy] = useState({
    category: taxonomy.category,
    type: taxonomy.type,
    subtype: taxonomy.subtype ?? '',
  })

  const [editedCoreSpecs, setEditedCoreSpecs] = useState<Record<string, string>>({
    make: String(coreSpecs.make ?? vinResult?.make ?? ''),
    model: String(coreSpecs.model ?? vinResult?.model ?? ''),
    year: String(coreSpecs.year ?? vinResult?.year ?? ''),
    engineType: String(coreSpecs.engineType ?? vinResult?.engineType ?? ''),
    transmission: String(coreSpecs.transmission ?? vinResult?.transmission ?? ''),
    gvwLbs: String(coreSpecs.gvwLbs ?? vinResult?.gvwLbs ?? ''),
    hoursOnMeter: String(coreSpecs.hoursOnMeter ?? ''),
  })

  const [editedTypeSpecs, setEditedTypeSpecs] = useState<Array<{ id: string; key: string; value: string }>>(
    Object.entries(typeSpecificSpecs).map(([key, value], index) => ({ id: String(index), key: camelToTitle(key), value: String(value ?? '') })),
  )

  const [aiPopulatedFields, setAiPopulatedFields] = useState<Set<string>>(() => {
    const fields = new Set<string>()
    for (const key of CORE_SPEC_KEYS) {
      if (coreSpecs[key] != null) fields.add(key)
    }
    for (const key of Object.keys(typeSpecificSpecs)) {
      fields.add(camelToTitle(key))
    }
    return fields
  })

  const [editedYard, setEditedYard] = useState({
    lotNumber: yardMetadata?.lotNumber ?? '',
    yardLocation: yardMetadata?.yardLocation ?? '',
    consignor: yardMetadata?.consignor ?? '',
  })

  const [resolvedConflicts, setResolvedConflicts] = useState<Record<string, 'ai' | 'vin'>>({})

  const [newSpecId, setNewSpecId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showError, setShowError] = useState(aiError)

  useEffect(() => {
    setShowError(aiError)
  }, [aiError])

  useEffect(() => {
    setEditedCoreSpecs((prev) => {
      const next = { ...prev }
      for (const key of CORE_SPEC_KEYS) {
        if (!manuallyEditedFields.current.has(key)) {
          const val = coreSpecs[key]
          if (val != null) {
            next[key] = String(val)
          }
        }
      }
      return next
    })

    setAiPopulatedFields((prev) => {
      const next = new Set(prev)
      for (const key of CORE_SPEC_KEYS) {
        if (coreSpecs[key] != null) next.add(key)
      }
      for (const key of Object.keys(typeSpecificSpecs)) {
        next.add(key)
      }
      return next
    })

    setEditedTypeSpecs((prev) => {
      const incomingEntries = Object.entries(typeSpecificSpecs)
      if (incomingEntries.length === 0) return prev

      if (prev.length === 0) {
        return incomingEntries.map(([key, value], index) => ({ id: String(index), key: camelToTitle(key), value: String(value ?? '') }))
      }

      const existingKeys = new Set(prev.map((s) => s.key))
      const toAdd = incomingEntries
        .filter(([key]) => !existingKeys.has(camelToTitle(key)))
        .map(([key, value]) => ({ id: String(Date.now()) + String(Math.random()), key: camelToTitle(key), value: String(value ?? '') }))

      return toAdd.length > 0 ? [...prev, ...toAdd] : prev
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coreSpecs, typeSpecificSpecs])

  const handleSubmit = async () => {
    setSubmitting(true)
    setSubmitError(null)
    try {
      const typeSpecsObj = editedTypeSpecs.reduce(
        (acc, { key, value }) => {
          const trimmedKey = key.trim()
          if (trimmedKey) acc[titleToCamel(trimmedKey)] = value
          return acc
        },
        {} as Record<string, string>,
      )

      await onSubmit({
        taxonomy: {
          category: editedTaxonomy.category,
          type: editedTaxonomy.type,
          subtype: editedTaxonomy.subtype || null,
        },
        coreSpecs: {
          make: editedCoreSpecs.make || null,
          model: editedCoreSpecs.model || null,
          year: editedCoreSpecs.year ? parseInt(editedCoreSpecs.year) : null,
          engineType: editedCoreSpecs.engineType || null,
          transmission: editedCoreSpecs.transmission || null,
          gvwLbs: editedCoreSpecs.gvwLbs ? parseInt(editedCoreSpecs.gvwLbs) : null,
          hoursOnMeter: editedCoreSpecs.hoursOnMeter ? parseInt(editedCoreSpecs.hoursOnMeter) : null,
        },
        typeSpecificSpecs: typeSpecsObj,
        yardMetadata: editedYard,
      })
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? 'Failed to save asset. Please try again.'
      setSubmitError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const inputStyle = [
    styles.input,
    { color: colors.inputText, borderColor: colors.inputBorder, backgroundColor: colors.inputBg, fontFamily: typography.bodyFamily },
  ] as const

  const conflictFields: Array<{
    specKey: string
    label: string
    aiValue: string | number | null | undefined
    vinValue: string | number | null | undefined
  }> = [
    { specKey: 'make', label: 'Make', aiValue: coreSpecs.make, vinValue: vinResult?.make },
    { specKey: 'model', label: 'Model', aiValue: coreSpecs.model, vinValue: vinResult?.model },
    { specKey: 'year', label: 'Year', aiValue: coreSpecs.year, vinValue: vinResult?.year },
    { specKey: 'engineType', label: 'Engine Type', aiValue: coreSpecs.engineType, vinValue: vinResult?.engineType },
    { specKey: 'transmission', label: 'Transmission', aiValue: coreSpecs.transmission, vinValue: vinResult?.transmission },
    { specKey: 'gvwLbs', label: 'GVW (lbs)', aiValue: coreSpecs.gvwLbs, vinValue: vinResult?.gvwLbs },
    { specKey: 'hoursOnMeter', label: 'Hours on Meter', aiValue: coreSpecs.hoursOnMeter, vinValue: null },
  ]

  return (
    <View style={[styles.outerContainer, { backgroundColor: colors.background }]}>
      <WizardHeader
        title="Review & Edit"
        showBack
        onBack={onBack}
        showMenu
        onRestart={onRestart}
        stepInfo={{ current: 5, total: 6 }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        {/* AI analysis in-progress banner */}
        {aiLoading && <AiAnalysisBanner />}

        {/* AI Error banner */}
        {aiError && !aiLoading && showError && (
          <View style={[styles.errorBanner, { backgroundColor: colors.errorBg }]} testID="ai-error-banner">
            <Ionicons name="alert-circle-outline" size={16} color={colors.error} style={{ marginRight: 8 }} />
            <Text style={[styles.errorBannerText, { color: colors.error, fontFamily: typography.bodyFamily }]}>
              AI analysis failed — fill in manually
            </Text>
            <TouchableOpacity onPress={() => onRetryAnalysis?.()} testID="ai-retry-button">
              <Text style={[styles.errorBannerAction, { color: colors.error, fontFamily: typography.bodyFamily }]}>Retry</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowError(false)} testID="ai-dismiss-button">
              <Text style={[styles.errorBannerAction, { color: colors.error, fontFamily: typography.bodyFamily }]}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Section 1: Taxonomy */}
        <SectionHeader title="Taxonomy" />
        <View style={[styles.sectionBox, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <FieldLabel label="Category" />
          <TextInput
            style={inputStyle}
            value={editedTaxonomy.category}
            onChangeText={(text) => setEditedTaxonomy((prev) => ({ ...prev, category: text }))}
            placeholderTextColor={colors.placeholder}
            accessibilityLabel="Category"
            testID="taxonomy-category"
          />
          <FieldLabel label="Type" />
          <TextInput
            style={inputStyle}
            value={editedTaxonomy.type}
            onChangeText={(text) => setEditedTaxonomy((prev) => ({ ...prev, type: text }))}
            placeholderTextColor={colors.placeholder}
            accessibilityLabel="Type"
            testID="taxonomy-type"
          />
          <FieldLabel label="Subtype" />
          <TextInput
            style={inputStyle}
            value={editedTaxonomy.subtype}
            onChangeText={(text) => setEditedTaxonomy((prev) => ({ ...prev, subtype: text }))}
            placeholder="None"
            placeholderTextColor={colors.placeholder}
            accessibilityLabel="Subtype"
            testID="taxonomy-subtype"
          />
        </View>

        {/* Section 2: Core Specs */}
        <SectionHeader title="Core Specs" />
        <View style={[styles.sectionBox, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          {aiLoading ? (
            <ShimmerRows testID="ai-loading-core-specs" />
          ) : (
            conflictFields.map(({ specKey, label, aiValue, vinValue }) => {
              const conflict = hasConflict(aiValue, vinValue)
              const isAi = aiPopulatedFields.has(specKey)
              return (
                <View
                  key={specKey}
                  style={[
                    styles.specRow,
                    conflict && !resolvedConflicts[specKey] && {
                      backgroundColor: colors.warningBg,
                      borderLeftColor: colors.warning,
                      borderLeftWidth: 3,
                    },
                  ]}
                  testID={conflict ? `conflict-row-${specKey}` : undefined}
                >
                  <FieldLabel
                    label={label}
                    isAiPopulated={isAi}
                    badgeTestID={isAi ? `ai-badge-${specKey}` : undefined}
                  />
                  {conflict && !resolvedConflicts[specKey] && (
                    <View style={styles.conflictPills}>
                      <TouchableOpacity
                        style={[styles.conflictPill, { backgroundColor: colors.aiBadgeBg, borderColor: colors.aiAccent }]}
                        onPress={() => {
                          setEditedCoreSpecs((prev) => ({ ...prev, [specKey]: String(aiValue ?? '') }))
                          setResolvedConflicts((prev) => ({ ...prev, [specKey]: 'ai' }))
                        }}
                        activeOpacity={0.7}
                        testID={`use-ai-${specKey}`}
                        accessibilityLabel={`Use AI value: ${String(aiValue)}`}
                        accessibilityRole="button"
                      >
                        <Text style={[styles.conflictPillSource, { color: colors.aiAccent, fontFamily: typography.bodyFamily }]}>
                          AI
                        </Text>
                        <Text style={[styles.conflictPillValue, { color: colors.aiAccent, fontFamily: typography.bodyFamily }]}>
                          {String(aiValue)}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.conflictPill, { backgroundColor: colors.warningBg, borderColor: colors.warning }]}
                        onPress={() => {
                          setEditedCoreSpecs((prev) => ({ ...prev, [specKey]: String(vinValue ?? '') }))
                          setResolvedConflicts((prev) => ({ ...prev, [specKey]: 'vin' }))
                        }}
                        activeOpacity={0.7}
                        testID={`use-vin-${specKey}`}
                        accessibilityLabel={`Use VIN value: ${String(vinValue)}`}
                        accessibilityRole="button"
                      >
                        <Text style={[styles.conflictPillSource, { color: colors.warning, fontFamily: typography.bodyFamily }]}>
                          VIN
                        </Text>
                        <Text style={[styles.conflictPillValue, { color: colors.warning, fontFamily: typography.bodyFamily }]}>
                          {String(vinValue)}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  {conflict && resolvedConflicts[specKey] && (
                    <View style={styles.resolvedIndicator}>
                      <Ionicons name="checkmark-circle" size={13} color={colors.success} />
                      <Text style={[styles.resolvedText, { color: colors.secondary, fontFamily: typography.bodyFamily }]}>
                        {resolvedConflicts[specKey] === 'ai' ? 'AI value selected' : 'VIN value selected'}
                      </Text>
                    </View>
                  )}
                  <TextInput
                    style={[...inputStyle, isAi ? { backgroundColor: colors.aiBg } : {}]}
                    value={editedCoreSpecs[specKey]}
                    onChangeText={(text) => {
                      manuallyEditedFields.current.add(specKey)
                      setAiPopulatedFields((prev) => {
                        const next = new Set(prev)
                        next.delete(specKey)
                        return next
                      })
                      setEditedCoreSpecs((prev) => ({ ...prev, [specKey]: text }))
                    }}
                    accessibilityLabel={label}
                    testID={`spec-${specKey}`}
                    placeholderTextColor={colors.placeholder}
                    keyboardType={
                      specKey === 'year' || specKey === 'gvwLbs' || specKey === 'hoursOnMeter'
                        ? 'numeric'
                        : 'default'
                    }
                  />
                </View>
              )
            })
          )}
        </View>

        {/* Section 3: Type-Specific Specs */}
        <SectionHeader title="Type-Specific Specs" />
        <View style={[styles.sectionBox, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          {aiLoading ? (
            <ShimmerRows testID="ai-loading-type-specs" />
          ) : (
            <>
              <View style={{ gap: 12 }}>
                {editedTypeSpecs.map((spec, index) => {
                  const isAi = aiPopulatedFields.has(spec.key)
                  const isNew = spec.id === newSpecId
                  return (
                    <SpecRow
                      key={spec.id}
                      specKey={spec.key}
                      value={spec.value}
                      isAiPopulated={isAi}
                      isNewSpec={isNew}
                      onValueChange={(text) => {
                        manuallyEditedFields.current.add(spec.key)
                        setAiPopulatedFields((prev) => {
                          const next = new Set(prev)
                          next.delete(spec.key)
                          return next
                        })
                        setEditedTypeSpecs((prev) =>
                          prev.map((s, i) => (i === index ? { ...s, value: text } : s)),
                        )
                      }}
                      onKeyChange={isNew ? (text) => {
                        setEditedTypeSpecs((prev) =>
                          prev.map((s, i) => (i === index ? { ...s, key: text } : s)),
                        )
                      } : undefined}
                      onDelete={() => {
                        setEditedTypeSpecs((prev) => prev.filter((_, i) => i !== index))
                        if (spec.id === newSpecId) setNewSpecId(null)
                      }}
                      testID={`type-spec-${index}`}
                    />
                  )
                })}
              </View>
              <TouchableOpacity
                style={[styles.addSpecButton, { borderColor: colors.borderStrong }]}
                onPress={() => {
                  const id = String(Date.now()) + String(Math.random())
                  setEditedTypeSpecs((prev) => [...prev, { id, key: '', value: '' }])
                  setNewSpecId(id)
                }}
                testID="add-spec-button"
              >
                <Ionicons name="add" size={14} color={colors.primary} />
                <Text style={[styles.addSpecButtonText, { color: colors.primary, fontFamily: typography.bodyFamily }]}>
                  Add Spec
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Section 4: Yard Metadata */}
        <SectionHeader title="Yard Metadata" />
        <View style={[styles.sectionBox, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <FieldLabel label="Lot Number" />
          <TextInput
            style={inputStyle}
            value={editedYard.lotNumber}
            onChangeText={(text) => setEditedYard((prev) => ({ ...prev, lotNumber: text }))}
            placeholderTextColor={colors.placeholder}
            accessibilityLabel="Lot Number"
            testID="yard-lot-number"
          />
          <FieldLabel label="Yard Location" />
          <TextInput
            style={inputStyle}
            value={editedYard.yardLocation}
            onChangeText={(text) => setEditedYard((prev) => ({ ...prev, yardLocation: text }))}
            placeholderTextColor={colors.placeholder}
            accessibilityLabel="Yard Location"
            testID="yard-location"
          />
          <FieldLabel label="Consignor" />
          <TextInput
            style={inputStyle}
            value={editedYard.consignor}
            onChangeText={(text) => setEditedYard((prev) => ({ ...prev, consignor: text }))}
            placeholderTextColor={colors.placeholder}
            accessibilityLabel="Consignor"
            testID="yard-consignor"
          />
        </View>

        {/* Section 5: Photos */}
        {photos.length > 0 && (
          <>
            <SectionHeader title="Photos" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.photoScroll}
              contentContainerStyle={styles.photoScrollContent}
            >
              {photos.map((photo, index) => (
                <View key={index} style={styles.photoThumbWrapper}>
                  <Image
                    source={{ uri: photo.uri }}
                    style={[styles.photoThumb, { borderColor: colors.border }]}
                    testID={`photo-thumb-${index}`}
                  />
                  <Text
                    style={[styles.photoLabel, { color: colors.secondary, fontFamily: typography.bodyFamily }]}
                    numberOfLines={1}
                  >
                    {photo.label}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </>
        )}

        {/* Save error banner */}
        {submitError && (
          <View style={[styles.errorBanner, { backgroundColor: colors.errorBg }]} testID="save-error-banner">
            <Ionicons name="alert-circle-outline" size={16} color={colors.error} style={{ marginRight: 8 }} />
            <Text style={[styles.errorBannerText, { color: colors.error, fontFamily: typography.bodyFamily }]}>
              Save failed — {submitError}
            </Text>
          </View>
        )}

        {/* Save Button */}
        <PrimaryButton
          title="Save Asset"
          onPress={handleSubmit}
          loading={submitting}
          disabled={submitting}
          icon="checkmark"
          style={styles.saveButton}
          testID="save-button"
        />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 48,
  },
  sectionHeader: {
    ...typography.label,
    marginTop: 24,
    marginBottom: 8,
  },
  sectionBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    gap: 4,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    marginBottom: 4,
  },
  fieldLabel: {
    ...typography.caption,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    ...typography.body,
    minHeight: 40,
  },
  specRow: {
    borderRadius: 8,
    padding: 4,
    marginBottom: 4,
    paddingLeft: 8,
  },
  conflictPills: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  conflictPill: {
    flex: 1,
    minHeight: 56,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  conflictPillSource: {
    ...typography.caption,
    textTransform: 'uppercase',
    opacity: 0.7,
  },
  conflictPillValue: {
    ...typography.body,
    textAlign: 'center',
  },
  resolvedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  resolvedText: {
    ...typography.label,
  },
  addSpecButton: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addSpecButtonText: {
    ...typography.bodySmall,
  },
  errorBanner: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorBannerText: {
    flex: 1,
    ...typography.bodySmall,
  },
  errorBannerAction: {
    ...typography.bodySmall,
    marginLeft: 12,
  },
  shimmerRow: {
    height: 36,
    borderRadius: 8,
    marginBottom: 10,
  },
  aiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 3,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  aiBannerText: {
    ...typography.body,
    flex: 1,
  },
  photoScroll: {
    marginTop: 4,
  },
  photoScrollContent: {
    gap: 8,
    paddingBottom: 8,
  },
  photoThumbWrapper: {
    width: 80,
    alignItems: 'center',
  },
  photoThumb: {
    width: 76,
    height: 76,
    borderRadius: 8,
    borderWidth: 1,
  },
  photoLabel: {
    ...typography.caption,
    marginTop: 4,
    maxWidth: 76,
    textAlign: 'center',
  },
  saveButton: {
    marginTop: 28,
  },
})
