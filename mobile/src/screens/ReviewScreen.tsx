import React, { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native'
import { useThemeColors, typography } from '../theme'
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
    <View style={[styles.outerContainer, { backgroundColor: colors.background }]}>
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
          <Text style={[styles.value, { color: colors.textValue }]}>{make}</Text>
        </View>
        <View style={[styles.row, { borderBottomColor: colors.separator }]}>
          <Text style={[styles.label, { color: colors.label }]}>Model</Text>
          <Text style={[styles.value, { color: colors.textValue }]}>{model}</Text>
        </View>
        <View style={[styles.row, { borderBottomColor: colors.separator }]}>
          <Text style={[styles.label, { color: colors.label }]}>Year</Text>
          <Text style={[styles.value, { color: colors.textValue }]}>{year}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionHeader, { color: colors.heading }]}>Condition</Text>
        <View style={[styles.row, { borderBottomColor: colors.separator }]}>
          <Text style={[styles.label, { color: colors.label }]}>Overall Rating</Text>
          <Text style={[styles.value, { color: colors.textValue }]}>{overall}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionHeader, { color: colors.heading }]}>Photos</Text>
        <View style={[styles.row, { borderBottomColor: colors.separator }]}>
          <Text style={[styles.label, { color: colors.label }]}>Photo Count</Text>
          <Text style={[styles.value, { color: colors.textValue }]}>{photoCount}</Text>
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
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    ...typography.heading,
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
    ...typography.body,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  label: {
    ...typography.body,
  },
  value: {
    ...typography.body,
  },
  submitButton: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    ...typography.button,
  },
})
