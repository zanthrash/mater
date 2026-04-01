import React, { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native'
import { useThemeColors, ThemeColors } from '../theme'

type Rating = 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Salvage'

const RATINGS: Rating[] = ['Excellent', 'Good', 'Fair', 'Poor', 'Salvage']

export interface SectionCondition {
  rating: string
  notes: string
}

export interface ConditionFormData {
  overall: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Salvage'
  engine: SectionCondition
  hydraulics: SectionCondition
  undercarriage: SectionCondition
  cab: SectionCondition
}

interface SectionData {
  rating: Rating
  notes: string
}

interface Props {
  conditionSummary?: string | null
  onContinue: (conditionData: ConditionFormData) => void
}

function RatingPicker({
  selected,
  onSelect,
  colors,
}: {
  selected: Rating
  onSelect: (r: Rating) => void
  colors: ThemeColors
}) {
  return (
    <View style={styles.ratingRow}>
      {RATINGS.map((r) => (
        <TouchableOpacity
          key={r}
          style={[
            styles.ratingButton,
            { backgroundColor: colors.surface, borderColor: colors.border },
            selected === r && { backgroundColor: colors.primary, borderColor: colors.primary },
          ]}
          onPress={() => onSelect(r)}
          accessibilityLabel={`Rate ${r}`}
        >
          <Text
            style={[
              styles.ratingButtonText,
              { color: colors.label },
              selected === r && styles.ratingButtonTextSelected,
            ]}
          >
            {r}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

const SECTIONS: Array<{ key: 'engine' | 'hydraulics' | 'undercarriage' | 'cab'; label: string }> = [
  { key: 'engine', label: 'Engine' },
  { key: 'hydraulics', label: 'Hydraulics' },
  { key: 'undercarriage', label: 'Undercarriage' },
  { key: 'cab', label: 'Cab' },
]

export function ConditionAssessmentScreen({ conditionSummary, onContinue }: Props) {
  const colors = useThemeColors()
  const [overall, setOverall] = useState<Rating>('Good')
  const [sections, setSections] = useState<Record<string, SectionData>>({
    engine: { rating: 'Good', notes: '' },
    hydraulics: { rating: 'Good', notes: '' },
    undercarriage: { rating: 'Good', notes: '' },
    cab: { rating: 'Good', notes: '' },
  })

  function setSection(key: string, patch: Partial<SectionData>) {
    setSections((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }))
  }

  function handleContinue() {
    onContinue({
      overall,
      engine: sections['engine'],
      hydraulics: sections['hydraulics'],
      undercarriage: sections['undercarriage'],
      cab: sections['cab'],
    })
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: colors.title }]}>Condition Assessment</Text>

      {conditionSummary ? (
        <View style={[styles.summaryBox, { backgroundColor: colors.surfaceAlt }]}>
          <Text style={[styles.summaryLabel, { color: colors.label }]}>AI Condition Summary</Text>
          <Text style={[styles.summaryText, { color: colors.body }]}>{conditionSummary}</Text>
        </View>
      ) : null}

      <Text style={[styles.sectionHeader, { color: colors.heading }]}>Overall Rating</Text>
      <RatingPicker selected={overall} onSelect={setOverall} colors={colors} />

      {SECTIONS.map(({ key, label }) => (
        <View key={key} style={[styles.sectionBox, { borderTopColor: colors.separator }]}>
          <Text style={[styles.sectionHeader, { color: colors.heading }]}>{label}</Text>
          <RatingPicker
            selected={sections[key].rating as Rating}
            onSelect={(r) => setSection(key, { rating: r })}
            colors={colors}
          />
          <TextInput
            style={[
              styles.notesInput,
              { color: colors.inputText, borderColor: colors.inputBorder, backgroundColor: colors.inputBg },
            ]}
            placeholder={`${label} notes...`}
            placeholderTextColor={colors.placeholder}
            value={sections[key].notes}
            onChangeText={(text) => setSection(key, { notes: text })}
            multiline
            accessibilityLabel={`${label} notes`}
          />
        </View>
      ))}

      <TouchableOpacity
        style={[styles.continueButton, { backgroundColor: colors.primary }]}
        onPress={handleContinue}
      >
        <Text style={styles.continueButtonText}>Continue</Text>
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
  summaryBox: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 20,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
    marginTop: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  ratingButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  ratingButtonText: {
    fontSize: 13,
  },
  ratingButtonTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  sectionBox: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
    minHeight: 64,
    textAlignVertical: 'top',
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
