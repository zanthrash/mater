import React from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native'

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
  analysis: EquipmentAnalysis
  onNext: () => void
}

function FieldRow({ label, value }: { label: string; value: string | number | null }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value !== null ? String(value) : '—'}</Text>
    </View>
  )
}

export function AIResultScreen({ analysis, onNext }: Props) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>AI Analysis Result</Text>
      <FieldRow label="Make" value={analysis.make} />
      <FieldRow label="Model" value={analysis.model} />
      <FieldRow label="Year" value={analysis.year} />
      <FieldRow label="Engine Type" value={analysis.engineType} />
      <FieldRow label="Transmission" value={analysis.transmission} />
      <FieldRow label="GVW (lbs)" value={analysis.gvwLbs} />
      <FieldRow label="Hours on Meter" value={analysis.hoursOnMeter} />
      <FieldRow label="Confidence Score" value={analysis.confidenceScore} />
      {analysis.conditionSummary ? (
        <View style={styles.summaryContainer}>
          <Text style={styles.label}>Condition Summary</Text>
          <Text style={styles.summaryText}>{analysis.conditionSummary}</Text>
        </View>
      ) : (
        <FieldRow label="Condition Summary" value={null} />
      )}
      <TouchableOpacity style={styles.nextButton} onPress={onNext}>
        <Text style={styles.nextButtonText}>Next</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
  },
  value: {
    fontSize: 14,
    color: '#111',
  },
  summaryContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  summaryText: {
    fontSize: 14,
    color: '#111',
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
