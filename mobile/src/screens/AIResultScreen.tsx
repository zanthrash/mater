import React from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native'
import { useThemeColors, ThemeColors } from '../theme'
import { WizardHeader } from '../components/WizardHeader'

interface EquipmentAnalysis {
  make: string | null
  model: string | null
  year: number | null
  engineType: string | null
  transmission: string | null
  gvwLbs: number | null
  hoursOnMeter: number | null
  conditionSummary: string | null
  confidenceScore: number | null
}

interface Props {
  analysis: EquipmentAnalysis | null
  onNext: () => void
  onBack?: () => void
  onRestart?: () => void
}

function FieldRow({ label, value, colors }: { label: string; value: string | number | null; colors: ThemeColors }) {
  return (
    <View style={[styles.row, { borderBottomColor: colors.separator }]}>
      <Text style={[styles.label, { color: colors.label }]}>{label}</Text>
      <Text style={[styles.value, { color: colors.value }]}>{value !== null ? String(value) : '—'}</Text>
    </View>
  )
}

export function AIResultScreen({ analysis, onNext, onBack, onRestart }: Props) {
  const colors = useThemeColors()

  if (!analysis) {
    return (
      <View style={styles.outerContainer}>
        <WizardHeader title="AI Analysis" showBack onBack={onBack} showMenu onRestart={onRestart} />
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          <Text style={{ fontSize: 14, color: colors.value }}>No analysis available.</Text>
          <TouchableOpacity style={styles.nextButton} onPress={onNext}>
            <Text style={styles.nextButtonText}>Next</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    )
  }
  return (
    <View style={styles.outerContainer}>
      <WizardHeader title="AI Analysis" showBack onBack={onBack} showMenu onRestart={onRestart} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <FieldRow label="Make" value={analysis.make} colors={colors} />
      <FieldRow label="Model" value={analysis.model} colors={colors} />
      <FieldRow label="Year" value={analysis.year} colors={colors} />
      <FieldRow label="Engine Type" value={analysis.engineType} colors={colors} />
      <FieldRow label="Transmission" value={analysis.transmission} colors={colors} />
      <FieldRow label="GVW (lbs)" value={analysis.gvwLbs} colors={colors} />
      <FieldRow label="Hours on Meter" value={analysis.hoursOnMeter} colors={colors} />
      <FieldRow label="Confidence Score" value={analysis.confidenceScore} colors={colors} />
      {analysis.conditionSummary ? (
        <View style={[styles.summaryContainer, { borderBottomColor: colors.separator }]}>
          <Text style={[styles.label, { color: colors.label }]}>Condition Summary</Text>
          <Text style={[styles.summaryText, { color: colors.body }]}>{analysis.conditionSummary}</Text>
        </View>
      ) : (
        <FieldRow label="Condition Summary" value={null} colors={colors} />
      )}
      <TouchableOpacity style={styles.nextButton} onPress={onNext}>
        <Text style={styles.nextButtonText}>Next</Text>
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  value: {
    fontSize: 14,
  },
  summaryContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  summaryText: {
    fontSize: 14,
    marginTop: 6,
    lineHeight: 20,
  },
  nextButton: {
    marginTop: 32,
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})
