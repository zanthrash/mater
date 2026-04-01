import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native'
import { useThemeColors } from '../theme'

interface Props {
  inspectionId: string
  pdfUrl: string
  onStartNew: () => void
}

export function SubmitScreen({ inspectionId, pdfUrl, onStartNew }: Props) {
  const colors = useThemeColors()

  function handleOpenPdf() {
    Linking.openURL(pdfUrl).catch((err: Error) => {
      Alert.alert('Could not open PDF', err.message)
    })
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.success }]}>Inspection Complete!</Text>

      <View style={[styles.idBox, { backgroundColor: colors.surface }]}>
        <Text style={[styles.idLabel, { color: colors.label }]}>Inspection ID</Text>
        <Text style={[styles.idValue, { color: colors.value }]}>{inspectionId}</Text>
      </View>

      <TouchableOpacity style={[styles.pdfButton, { backgroundColor: colors.primary }]} onPress={handleOpenPdf}>
        <Text style={styles.pdfButtonText}>Open PDF Report</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.newButton, { backgroundColor: colors.secondaryButtonBg, borderColor: colors.secondaryButtonBorder }]}
        onPress={onStartNew}
      >
        <Text style={[styles.newButtonText, { color: colors.secondaryButtonText }]}>Start New Inspection</Text>
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
    marginBottom: 32,
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
  pdfButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  pdfButtonText: {
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
