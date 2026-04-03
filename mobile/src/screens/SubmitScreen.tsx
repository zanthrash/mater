import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { useThemeColors } from '../theme'

interface Props {
  assetId: string
  assetSummary: { make: string | null; model: string | null; category: string | null; type: string | null }
  onStartNew: () => void
  onViewInList: () => void
}

export function SubmitScreen({ assetId, assetSummary, onStartNew, onViewInList }: Props) {
  const colors = useThemeColors()

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.success }]}>Asset Ingested!</Text>

      <View style={[styles.idBox, { backgroundColor: colors.surface }]}>
        <Text style={[styles.idLabel, { color: colors.label }]}>Asset ID</Text>
        <Text style={[styles.idValue, { color: colors.value }]}>{assetId}</Text>
      </View>

      <View style={[styles.summaryBox, { backgroundColor: colors.surface }]}>
        <Text style={[styles.summaryText, { color: colors.value }]}>
          {[assetSummary.make, assetSummary.model].filter(Boolean).join(' ') || 'Unknown Equipment'}
        </Text>
        <Text style={[styles.summarySubText, { color: colors.label }]}>
          {[assetSummary.category, assetSummary.type].filter(Boolean).join(' > ')}
        </Text>
      </View>

      <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.primary }]} onPress={onViewInList}>
        <Text style={styles.primaryButtonText}>View in List</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.newButton, { backgroundColor: colors.secondaryButtonBg, borderColor: colors.secondaryButtonBorder }]}
        onPress={onStartNew}
      >
        <Text style={[styles.newButtonText, { color: colors.secondaryButtonText }]}>Ingest Another</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 32,
    textAlign: 'center',
  },
  idBox: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    width: '100%',
    alignItems: 'center',
  },
  idLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  idValue: {
    fontSize: 14,
    fontFamily: 'monospace',
  },
  summaryBox: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 32,
    width: '100%',
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  summarySubText: {
    fontSize: 13,
  },
  primaryButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  newButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
  },
  newButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
})
