import React, { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
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
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function hasConflict(
  aiValue: string | number | null | undefined,
  vinValue: string | number | null | undefined,
): boolean {
  if (aiValue == null || vinValue == null) return false
  return String(aiValue).toLowerCase().trim() !== String(vinValue).toLowerCase().trim()
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionHeader({ title, colors }: { title: string; colors: ReturnType<typeof useThemeColors> }) {
  return (
    <Text style={[styles.sectionHeader, { color: colors.heading }]}>{title}</Text>
  )
}

function FieldLabel({ label, colors }: { label: string; colors: ReturnType<typeof useThemeColors> }) {
  return (
    <Text style={[styles.fieldLabel, { color: colors.label }]}>{label}</Text>
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
}: Props) {
  const colors = useThemeColors()

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

  const [editedTypeSpecs, setEditedTypeSpecs] = useState<Array<{ key: string; value: string }>>(
    Object.entries(typeSpecificSpecs).map(([key, value]) => ({ key, value: String(value ?? '') })),
  )

  const [editedYard, setEditedYard] = useState({
    lotNumber: yardMetadata?.lotNumber ?? '',
    yardLocation: yardMetadata?.yardLocation ?? '',
    consignor: yardMetadata?.consignor ?? '',
  })

  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    setSubmitting(true)
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
    <View style={styles.outerContainer}>
      <WizardHeader title="Review & Edit" showBack onBack={onBack} showMenu onRestart={onRestart} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

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
          {conflictFields.map(({ specKey, label, aiValue, vinValue }) => {
            const conflict = hasConflict(aiValue, vinValue)
            return (
              <View
                key={specKey}
                style={[styles.specRow, conflict && { backgroundColor: colors.warningBg }]}
                testID={conflict ? `conflict-row-${specKey}` : undefined}
              >
                <FieldLabel label={label} colors={colors} />
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
                  style={inputStyle}
                  value={editedCoreSpecs[specKey]}
                  onChangeText={(text) =>
                    setEditedCoreSpecs((prev) => ({ ...prev, [specKey]: text }))
                  }
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
          })}
        </View>

        {/* Section 3: Type-Specific Specs */}
        <SectionHeader title="Type-Specific Specs" colors={colors} />
        <View style={[styles.sectionBox, { borderColor: colors.border }]}>
          {editedTypeSpecs.map((spec, index) => (
            <View key={index} style={styles.typeSpecRow}>
              <TextInput
                style={[inputStyle, styles.typeSpecKeyInput]}
                value={spec.key}
                onChangeText={(text) =>
                  setEditedTypeSpecs((prev) =>
                    prev.map((s, i) => (i === index ? { ...s, key: text } : s)),
                  )
                }
                placeholder="Key"
                placeholderTextColor={colors.placeholder}
                accessibilityLabel={`Type spec key ${index}`}
                testID={`type-spec-key-${index}`}
              />
              <TextInput
                style={[inputStyle, styles.typeSpecValueInput]}
                value={spec.value}
                onChangeText={(text) =>
                  setEditedTypeSpecs((prev) =>
                    prev.map((s, i) => (i === index ? { ...s, value: text } : s)),
                  )
                }
                placeholder="Value"
                placeholderTextColor={colors.placeholder}
                accessibilityLabel={`Type spec value ${index}`}
                testID={`type-spec-value-${index}`}
              />
            </View>
          ))}
          <TouchableOpacity
            style={[styles.addSpecButton, { borderColor: colors.primary }]}
            onPress={() => setEditedTypeSpecs((prev) => [...prev, { key: '', value: '' }])}
            testID="add-spec-button"
          >
            <Text style={[styles.addSpecButtonText, { color: colors.primary }]}>+ Add Spec</Text>
          </TouchableOpacity>
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
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 2,
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
