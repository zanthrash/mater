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
import { useThemeColors } from '../theme'
import { WizardHeader } from '../components/WizardHeader'

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

function SectionHeader({ title, colors }: { title: string; colors: ReturnType<typeof useThemeColors> }) {
  return (
    <Text style={[styles.sectionHeader, { color: colors.heading }]}>{title}</Text>
  )
}

function FieldLabel({
  label,
  colors,
  isAiPopulated,
  badgeTestID,
}: {
  label: string
  colors: ReturnType<typeof useThemeColors>
  isAiPopulated?: boolean
  badgeTestID?: string
}) {
  if (isAiPopulated) {
    return (
      <View style={styles.fieldLabelRow}>
        <Text style={[styles.fieldLabel, { color: colors.label }]}>✨ {label}</Text>
        <View style={[styles.aiBadge, { backgroundColor: colors.aiBadge }]} testID={badgeTestID}>
          <Text style={[styles.aiBadgeText, { color: colors.aiBadgeText }]}>AI</Text>
        </View>
      </View>
    )
  }
  return (
    <Text style={[styles.fieldLabel, { color: colors.label }]}>{label}</Text>
  )
}

function ShimmerRows({ testID, colors }: { testID: string; colors: ReturnType<typeof useThemeColors> }) {
  const opacity = useRef(new Animated.Value(0.4)).current

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1.0, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    )
    animation.start()
    return () => animation.stop()
  }, [opacity])

  return (
    <View testID={testID}>
      {[0, 1, 2].map((i) => (
        <Animated.View
          key={i}
          style={[
            styles.shimmerRow,
            { backgroundColor: colors.surface, opacity },
          ]}
        />
      ))}
    </View>
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
    Object.entries(typeSpecificSpecs).map(([key, value], index) => ({ id: String(index), key, value: String(value ?? '') })),
  )

  // Initialize aiPopulatedFields from initial props
  const [aiPopulatedFields, setAiPopulatedFields] = useState<Set<string>>(() => {
    const fields = new Set<string>()
    for (const key of CORE_SPEC_KEYS) {
      if (coreSpecs[key] != null) fields.add(key)
    }
    for (const key of Object.keys(typeSpecificSpecs)) {
      fields.add(key)
    }
    return fields
  })

  const [editedYard, setEditedYard] = useState({
    lotNumber: yardMetadata?.lotNumber ?? '',
    yardLocation: yardMetadata?.yardLocation ?? '',
    consignor: yardMetadata?.consignor ?? '',
  })

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const [showError, setShowError] = useState(aiError)

  // Sync showError when aiError prop changes
  useEffect(() => {
    setShowError(aiError)
  }, [aiError])

  // Reactivity fix: update form state when coreSpecs/typeSpecificSpecs arrive async
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
        // No user entries yet — replace entirely
        return incomingEntries.map(([key, value], index) => ({ id: String(index), key, value: String(value ?? '') }))
      }

      // User has entries — append only keys not already present
      const existingKeys = new Set(prev.map((s) => s.key))
      const toAdd = incomingEntries
        .filter(([key]) => !existingKeys.has(key))
        .map(([key, value]) => ({ id: String(Date.now()) + String(Math.random()), key, value: String(value ?? '') }))

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
          if (key.trim()) acc[key.trim()] = value
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
    { color: colors.inputText, borderColor: colors.inputBorder, backgroundColor: colors.inputBg },
  ]

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
    {
      specKey: 'transmission',
      label: 'Transmission',
      aiValue: coreSpecs.transmission,
      vinValue: vinResult?.transmission,
    },
    { specKey: 'gvwLbs', label: 'GVW (lbs)', aiValue: coreSpecs.gvwLbs, vinValue: vinResult?.gvwLbs },
    { specKey: 'hoursOnMeter', label: 'Hours on Meter', aiValue: coreSpecs.hoursOnMeter, vinValue: null },
  ]

  return (
    <View style={[styles.outerContainer, { backgroundColor: colors.background }]}>
      <WizardHeader title="Review & Edit" showBack onBack={onBack} showMenu onRestart={onRestart} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        {/* Error banner */}
        {aiError && !aiLoading && showError && (
          <View
            style={[styles.errorBanner, { backgroundColor: colors.errorBg }]}
            testID="ai-error-banner"
          >
            <Text style={[styles.errorBannerText, { color: colors.error }]}>
              ⚠ AI analysis failed — fill in manually
            </Text>
            <TouchableOpacity onPress={() => onRetryAnalysis?.()} testID="ai-retry-button">
              <Text style={[styles.errorBannerAction, { color: colors.error }]}>Retry</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowError(false)} testID="ai-dismiss-button">
              <Text style={[styles.errorBannerAction, { color: colors.error }]}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Section 1: Taxonomy */}
        <SectionHeader title="Taxonomy" colors={colors} />
        <View style={[styles.sectionBox, { borderColor: colors.border }]}>
          <FieldLabel label="Category" colors={colors} />
          <TextInput
            style={inputStyle}
            value={editedTaxonomy.category}
            onChangeText={(text) => setEditedTaxonomy((prev) => ({ ...prev, category: text }))}
            accessibilityLabel="Category"
            testID="taxonomy-category"
          />

          <FieldLabel label="Type" colors={colors} />
          <TextInput
            style={inputStyle}
            value={editedTaxonomy.type}
            onChangeText={(text) => setEditedTaxonomy((prev) => ({ ...prev, type: text }))}
            accessibilityLabel="Type"
            testID="taxonomy-type"
          />

          <FieldLabel label="Subtype" colors={colors} />
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
        <SectionHeader title="Core Specs" colors={colors} />
        <View style={[styles.sectionBox, { borderColor: colors.border }]}>
          {aiLoading ? (
            <ShimmerRows testID="ai-loading-core-specs" colors={colors} />
          ) : (
            conflictFields.map(({ specKey, label, aiValue, vinValue }) => {
              const conflict = hasConflict(aiValue, vinValue)
              const isAi = aiPopulatedFields.has(specKey)
              return (
                <View
                  key={specKey}
                  style={[styles.specRow, conflict && { backgroundColor: colors.warningBg }]}
                  testID={conflict ? `conflict-row-${specKey}` : undefined}
                >
                  <FieldLabel
                    label={label}
                    colors={colors}
                    isAiPopulated={isAi}
                    badgeTestID={isAi ? `ai-badge-${specKey}` : undefined}
                  />
                  {conflict && (
                    <View style={styles.conflictHints}>
                      <Text style={[styles.conflictHint, { color: colors.warning }]}>
                        AI: {String(aiValue)}
                      </Text>
                      <Text style={[styles.conflictHint, { color: colors.warning }]}>
                        VIN: {String(vinValue)}
                      </Text>
                      <TouchableOpacity
                        onPress={() =>
                          setEditedCoreSpecs((prev) => ({
                            ...prev,
                            [specKey]: String(aiValue ?? ''),
                          }))
                        }
                        testID={`use-ai-${specKey}`}
                      >
                        <Text style={[styles.useAiLink, { color: colors.primary }]}>Use AI value</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  <TextInput
                    style={[
                      inputStyle,
                      isAi ? { backgroundColor: colors.aiBg } : undefined,
                    ]}
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
        <SectionHeader title="Type-Specific Specs" colors={colors} />
        <View style={[styles.sectionBox, { borderColor: colors.border }]}>
          {aiLoading ? (
            <ShimmerRows testID="ai-loading-type-specs" colors={colors} />
          ) : (
            <>
              {editedTypeSpecs.map((spec, index) => {
                const isAi = aiPopulatedFields.has(spec.key)
                return (
                  <View key={spec.id} style={styles.typeSpecRow}>
                    <TextInput
                      style={[inputStyle, styles.typeSpecKeyInput]}
                      value={spec.key}
                      onChangeText={(text) => {
                        manuallyEditedFields.current.add(text)
                        setAiPopulatedFields((prev) => {
                          const next = new Set(prev)
                          next.delete(spec.key)
                          return next
                        })
                        setEditedTypeSpecs((prev) =>
                          prev.map((s, i) => (i === index ? { ...s, key: text } : s)),
                        )
                      }}
                      placeholder="Key"
                      placeholderTextColor={colors.placeholder}
                      accessibilityLabel={`Type spec key ${index}`}
                      testID={`type-spec-key-${index}`}
                    />
                    <TextInput
                      style={[
                        inputStyle,
                        styles.typeSpecValueInput,
                        isAi ? { backgroundColor: colors.aiBg } : undefined,
                      ]}
                      value={spec.value}
                      onChangeText={(text) => {
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
                      placeholder="Value"
                      placeholderTextColor={colors.placeholder}
                      accessibilityLabel={`Type spec value ${index}`}
                      testID={`type-spec-value-${index}`}
                    />
                  </View>
                )
              })}
              <TouchableOpacity
                style={[styles.addSpecButton, { borderColor: colors.primary }]}
                onPress={() => setEditedTypeSpecs((prev) => [...prev, { id: String(Date.now()) + String(Math.random()), key: '', value: '' }])}
                testID="add-spec-button"
              >
                <Text style={[styles.addSpecButtonText, { color: colors.primary }]}>+ Add Spec</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Section 4: Yard Metadata */}
        <SectionHeader title="Yard Metadata" colors={colors} />
        <View style={[styles.sectionBox, { borderColor: colors.border }]}>
          <FieldLabel label="Lot Number" colors={colors} />
          <TextInput
            style={inputStyle}
            value={editedYard.lotNumber}
            onChangeText={(text) => setEditedYard((prev) => ({ ...prev, lotNumber: text }))}
            accessibilityLabel="Lot Number"
            testID="yard-lot-number"
          />

          <FieldLabel label="Yard Location" colors={colors} />
          <TextInput
            style={inputStyle}
            value={editedYard.yardLocation}
            onChangeText={(text) => setEditedYard((prev) => ({ ...prev, yardLocation: text }))}
            accessibilityLabel="Yard Location"
            testID="yard-location"
          />

          <FieldLabel label="Consignor" colors={colors} />
          <TextInput
            style={inputStyle}
            value={editedYard.consignor}
            onChangeText={(text) => setEditedYard((prev) => ({ ...prev, consignor: text }))}
            accessibilityLabel="Consignor"
            testID="yard-consignor"
          />
        </View>

        {/* Section 5: Photos */}
        {photos.length > 0 && (
          <>
            <SectionHeader title="Photos" colors={colors} />
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
                    style={styles.photoThumb}
                    testID={`photo-thumb-${index}`}
                  />
                  <Text
                    style={[styles.photoLabel, { color: colors.secondary }]}
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
          <View
            style={[styles.errorBanner, { backgroundColor: colors.errorBg }]}
            testID="save-error-banner"
          >
            <Text style={[styles.errorBannerText, { color: colors.error }]}>
              ⚠ Save failed — {submitError}
            </Text>
          </View>
        )}

        {/* Save Button */}
        <TouchableOpacity
          style={[
            styles.saveButton,
            { backgroundColor: submitting ? colors.buttonDisabledBg : colors.primary },
          ]}
          onPress={handleSubmit}
          disabled={submitting}
          testID="save-button"
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Asset</Text>
          )}
        </TouchableOpacity>
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
    padding: 24,
    paddingBottom: 48,
  },
  sectionHeader: {
    fontSize: 17,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 10,
  },
  sectionBox: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    gap: 6,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 2,
  },
  aiBadge: {
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
  },
  specRow: {
    borderRadius: 6,
    padding: 6,
    marginBottom: 4,
  },
  conflictHints: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
    alignItems: 'center',
  },
  conflictHint: {
    fontSize: 12,
    fontWeight: '500',
  },
  useAiLink: {
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  typeSpecRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  typeSpecKeyInput: {
    flex: 1,
  },
  typeSpecValueInput: {
    flex: 2,
  },
  addSpecButton: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
  },
  addSpecButtonText: {
    fontSize: 14,
    fontWeight: '600',
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
    fontSize: 14,
  },
  errorBannerAction: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 12,
  },
  shimmerRow: {
    height: 16,
    borderRadius: 4,
    marginBottom: 12,
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
    width: 72,
    height: 72,
    borderRadius: 6,
  },
  photoLabel: {
    fontSize: 10,
    marginTop: 4,
    maxWidth: 72,
    textAlign: 'center',
  },
  saveButton: {
    marginTop: 32,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})
