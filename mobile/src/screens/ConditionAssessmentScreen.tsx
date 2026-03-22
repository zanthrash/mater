import React, { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native'

type Rating = 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Salvage'

const RATINGS: Rating[] = ['Excellent', 'Good', 'Fair', 'Poor', 'Salvage']

interface SectionData {
  rating: Rating
  notes: string
}

interface Props {
  conditionSummary?: string | null
  onContinue: (conditionData: {
    overall: Rating
    engine: { rating: string; notes: string }
    hydraulics: { rating: string; notes: string }
    undercarriage: { rating: string; notes: string }
    cab: { rating: string; notes: string }
  }) => void
}

function RatingPicker({
  selected,
  onSelect,
}: {
  selected: Rating
  onSelect: (r: Rating) => void
}) {
  return (
    <View style={styles.ratingRow}>
      {RATINGS.map((r) => (
        <TouchableOpacity
          key={r}
          style={[styles.ratingButton, selected === r && styles.ratingButtonSelected]}
          onPress={() => onSelect(r)}
          accessibilityLabel={`Rate ${r}`}
        >
          <Text style={[styles.ratingButtonText, selected === r && styles.ratingButtonTextSelected]}>
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
      <Text style={styles.title}>Condition Assessment</Text>

      {conditionSummary ? (
        <View style={styles.summaryBox}>
          <Text style={styles.summaryLabel}>AI Condition Summary</Text>
          <Text style={styles.summaryText}>{conditionSummary}</Text>
        </View>
      ) : null}

      <Text style={styles.sectionHeader}>Overall Rating</Text>
      <RatingPicker selected={overall} onSelect={setOverall} />

      {SECTIONS.map(({ key, label }) => (
        <View key={key} style={styles.sectionBox}>
          <Text style={styles.sectionHeader}>{label}</Text>
          <RatingPicker
            selected={sections[key].rating as Rating}
            onSelect={(r) => setSection(key, { rating: r })}
          />
          <TextInput
            style={styles.notesInput}
            placeholder={`${label} notes...`}
            value={sections[key].notes}
            onChangeText={(text) => setSection(key, { notes: text })}
            multiline
            accessibilityLabel={`${label} notes`}
          />
        </View>
      ))}

      <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
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
    backgroundColor: '#EAF4FF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#555',
    marginBottom: 6,
  },
  summaryText: {
    fontSize: 14,
    color: '#111',
    lineHeight: 20,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
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
    borderColor: '#ccc',
    backgroundColor: '#f5f5f5',
  },
  ratingButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  ratingButtonText: {
    fontSize: 13,
    color: '#333',
  },
  ratingButtonTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  sectionBox: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
    minHeight: 64,
    color: '#111',
    textAlignVertical: 'top',
  },
  continueButton: {
    marginTop: 32,
    backgroundColor: '#007AFF',
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
