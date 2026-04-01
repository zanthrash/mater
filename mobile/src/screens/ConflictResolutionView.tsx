import React, { useState, useMemo } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native'
import { useThemeColors } from '../theme'
import { WizardHeader } from '../components/WizardHeader'

interface EquipmentField {
  key: string
  label: string
}

const FIELDS: EquipmentField[] = [
  { key: 'make', label: 'Make' },
  { key: 'model', label: 'Model' },
  { key: 'year', label: 'Year' },
  { key: 'engineType', label: 'Engine Type' },
  { key: 'transmission', label: 'Transmission' },
  { key: 'gvwLbs', label: 'GVW (lbs)' },
]

interface AIResult {
  make: string | null
  model: string | null
  year: number | null
  engineType: string | null
  transmission: string | null
  gvwLbs: number | null
  [key: string]: string | number | null
}

interface VINResult {
  make: string | null
  model: string | null
  year: number | null
  engineType: string | null
  transmission: string | null
  gvwLbs: number | null
  source: 'nhtsa' | 'claude'
  [key: string]: string | number | null
}

interface Props {
  aiResult: AIResult | null
  vinResult: VINResult | null
  onResolved: (resolvedData: Record<string, string | number | null>) => void
  onBack?: () => void
  onRestart?: () => void
}

type Source = 'ai' | 'vin'

function computeInitialSelections(
  aiResult: AIResult | null,
  vinResult: VINResult | null,
): Record<string, Source | null> {
  const selections: Record<string, Source | null> = {}
  for (const field of FIELDS) {
    const aiVal = aiResult ? aiResult[field.key] : null
    const vinVal = vinResult ? vinResult[field.key] : null

    if (aiVal === null && vinVal === null) {
      selections[field.key] = null
    } else if (aiVal === null) {
      selections[field.key] = 'vin'
    } else if (vinVal === null) {
      selections[field.key] = 'ai'
    } else if (String(aiVal) === String(vinVal)) {
      // values agree — prefer ai (either works)
      selections[field.key] = 'ai'
    } else {
      // conflict — user must pick
      selections[field.key] = null
    }
  }
  return selections
}

export function ConflictResolutionView({ aiResult, vinResult, onResolved, onBack, onRestart }: Props) {
  const colors = useThemeColors()
  const [selections, setSelections] = useState<Record<string, Source | null>>(
    () => computeInitialSelections(aiResult, vinResult),
  )

  const themed = useMemo(() => ({
    title: { color: colors.title },
    headerCell: { color: colors.secondary },
    headerRow: { borderBottomColor: colors.border },
    row: { borderBottomColor: colors.separator },
    conflictRow: { backgroundColor: colors.warningBg },
    fieldLabel: { color: colors.label },
    valueText: { color: colors.value },
    checkmark: { color: colors.checkmark },
    continueButton: { backgroundColor: colors.primary },
  }), [colors])

  function selectSource(fieldKey: string, source: Source) {
    setSelections((prev) => ({ ...prev, [fieldKey]: source }))
  }

  function handleContinue() {
    const resolvedData: Record<string, string | number | null> = {}
    for (const field of FIELDS) {
      const sel = selections[field.key]
      if (sel === 'ai') {
        resolvedData[field.key] = aiResult ? aiResult[field.key] : null
      } else if (sel === 'vin') {
        resolvedData[field.key] = vinResult ? vinResult[field.key] : null
      } else {
        resolvedData[field.key] = null
      }
    }
    onResolved(resolvedData)
  }

  function isConflict(fieldKey: string): boolean {
    const aiVal = aiResult ? aiResult[fieldKey] : null
    const vinVal = vinResult ? vinResult[fieldKey] : null
    return aiVal !== null && vinVal !== null && String(aiVal) !== String(vinVal)
  }

  return (
    <View style={styles.outerContainer}>
      <WizardHeader title="Resolve Conflicts" showBack onBack={onBack} showMenu onRestart={onRestart} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Column headers */}
      <View style={[styles.headerRow, themed.headerRow]}>
        <Text style={[styles.headerCell, styles.fieldCell, themed.headerCell]}>Field</Text>
        <Text style={[styles.headerCell, styles.valueCell, themed.headerCell]}>AI Analysis</Text>
        <Text style={[styles.headerCell, styles.valueCell, themed.headerCell]}>VIN Lookup</Text>
      </View>

      {FIELDS.map((field) => {
        const aiVal = aiResult ? aiResult[field.key] : null
        const vinVal = vinResult ? vinResult[field.key] : null
        const conflict = isConflict(field.key)
        const selected = selections[field.key]

        return (
          <View
            key={field.key}
            style={[styles.row, themed.row, conflict && themed.conflictRow]}
          >
            <Text style={[styles.cell, styles.fieldCell, styles.fieldLabel, themed.fieldLabel]}>
              {field.label}
            </Text>

            <TouchableOpacity
              style={[styles.cell, styles.valueCell]}
              onPress={() => selectSource(field.key, 'ai')}
              accessible
              accessibilityLabel={`Select AI value for ${field.label}`}
            >
              <Text style={[styles.valueText, themed.valueText]}>
                {aiVal !== null ? String(aiVal) : '—'}
              </Text>
              {selected === 'ai' && (
                <Text style={[styles.checkmark, themed.checkmark]}>✓</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.cell, styles.valueCell]}
              onPress={() => selectSource(field.key, 'vin')}
              accessible
              accessibilityLabel={`Select VIN value for ${field.label}`}
            >
              <Text style={[styles.valueText, themed.valueText]}>
                {vinVal !== null ? String(vinVal) : '—'}
              </Text>
              {selected === 'vin' && (
                <Text style={[styles.checkmark, themed.checkmark]}>✓</Text>
              )}
            </TouchableOpacity>
          </View>
        )
      })}

      <TouchableOpacity style={[styles.continueButton, themed.continueButton]} onPress={handleContinue}>
        <Text style={styles.continueButtonText}>Continue</Text>
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
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    paddingBottom: 8,
    marginBottom: 4,
  },
  headerCell: {
    fontSize: 13,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  cell: {
    paddingHorizontal: 4,
  },
  fieldCell: {
    flex: 2,
  },
  valueCell: {
    flex: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  valueText: {
    fontSize: 14,
    flex: 1,
  },
  checkmark: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  continueButton: {
    marginTop: 32,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})
