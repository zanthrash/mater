import React, { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native'
import type { ConditionFormData } from './ConditionAssessmentScreen'

interface Props {
  equipmentData: Record<string, unknown> | null
  conditionData: ConditionFormData | null
  photoCount: number
  onSubmit: (inspectorName: string) => void
}

export function ReviewScreen({ equipmentData, conditionData, photoCount, onSubmit }: Props) {
  const [inspectorName, setInspectorName] = useState('')

  const make = equipmentData?.make != null ? String(equipmentData.make) : '—'
  const model = equipmentData?.model != null ? String(equipmentData.model) : '—'
  const year = equipmentData?.year != null ? String(equipmentData.year) : '—'
  const overall = conditionData?.overall ?? '—'

  function handleSubmit() {
    onSubmit(inspectorName.trim() || 'Field Inspector')
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Review & Submit</Text>

      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Inspector</Text>
        <TextInput
          style={styles.input}
          placeholder="Field Inspector"
          value={inspectorName}
          onChangeText={setInspectorName}
          accessibilityLabel="Inspector name"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Equipment</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Make</Text>
          <Text style={styles.value}>{make}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Model</Text>
          <Text style={styles.value}>{model}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Year</Text>
          <Text style={styles.value}>{year}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Condition</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Overall Rating</Text>
          <Text style={styles.value}>{overall}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Photos</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Photo Count</Text>
          <Text style={styles.value}>{photoCount}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.submitButtonText}>Submit Inspection</Text>
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
    marginBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
    color: '#111',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
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
  submitButton: {
    marginTop: 8,
    backgroundColor: '#28a745',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})
