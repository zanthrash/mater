import React, { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native'
import { useThemeColors } from '../theme'
import type { ConditionFormData } from './ConditionAssessmentScreen'
import { WizardHeader } from '../components/WizardHeader'

interface Props {
  equipmentData: Record<string, unknown> | null
  conditionData: ConditionFormData | null
  photoCount: number
  onSubmit: (inspectorName: string) => void
  onBack?: () => void
  onRestart?: () => void
}

export function ReviewScreen({ equipmentData, conditionData, photoCount, onSubmit, onBack, onRestart }: Props) {
  const colors = useThemeColors()
  const [inspectorName, setInspectorName] = useState('')

  const make = equipmentData?.make != null ? String(equipmentData.make) : '—'
  const model = equipmentData?.model != null ? String(equipmentData.model) : '—'
  const year = equipmentData?.year != null ? String(equipmentData.year) : '—'
  const overall = conditionData?.overall ?? '—'

  function handleSubmit() {
    onSubmit(inspectorName.trim() || 'Field Inspector')
  }

  return (
    <View style={styles.outerContainer}>
      <WizardHeader title="Review & Submit" showBack onBack={onBack} showMenu onRestart={onRestart} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={[styles.sectionHeader, { color: colors.heading }]}>Inspector</Text>
        <TextInput
          style={[styles.input, { color: colors.inputText, borderColor: colors.inputBorder, backgroundColor: colors.inputBg }]}
          placeholder="Field Inspector"
          placeholderTextColor={colors.placeholder}
          value={inspectorName}
          onChangeText={setInspectorName}
          accessibilityLabel="Inspector name"
        />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionHeader, { color: colors.heading }]}>Equipment</Text>
        <View style={[styles.row, { borderBottomColor: colors.separator }]}>
          <Text style={[styles.label, { color: colors.label }]}>Make</Text>
          <Text style={[styles.value, { color: colors.value }]}>{make}</Text>
        </View>
        <View style={[styles.row, { borderBottomColor: colors.separator }]}>
          <Text style={[styles.label, { color: colors.label }]}>Model</Text>
          <Text style={[styles.value, { color: colors.value }]}>{model}</Text>
        </View>
        <View style={[styles.row, { borderBottomColor: colors.separator }]}>
          <Text style={[styles.label, { color: colors.label }]}>Year</Text>
          <Text style={[styles.value, { color: colors.value }]}>{year}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionHeader, { color: colors.heading }]}>Condition</Text>
        <View style={[styles.row, { borderBottomColor: colors.separator }]}>
          <Text style={[styles.label, { color: colors.label }]}>Overall Rating</Text>
          <Text style={[styles.value, { color: colors.value }]}>{overall}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionHeader, { color: colors.heading }]}>Photos</Text>
        <View style={[styles.row, { borderBottomColor: colors.separator }]}>
          <Text style={[styles.label, { color: colors.label }]}>Photo Count</Text>
          <Text style={[styles.value, { color: colors.value }]}>{photoCount}</Text>
        </View>
      </View>

      <TouchableOpacity style={[styles.submitButton, { backgroundColor: colors.success }]} onPress={handleSubmit}>
        <Text style={styles.submitButtonText}>Submit Inspection</Text>
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
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  value: {
    fontSize: 14,
  },
  submitButton: {
    marginTop: 8,
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
