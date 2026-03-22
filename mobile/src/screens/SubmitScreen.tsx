import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native'

interface Props {
  inspectionId: string
  pdfUrl: string
  onStartNew: () => void
}

export function SubmitScreen({ inspectionId, pdfUrl, onStartNew }: Props) {
  function handleOpenPdf() {
    Linking.openURL(pdfUrl)
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Inspection Complete!</Text>

      <View style={styles.idBox}>
        <Text style={styles.idLabel}>Inspection ID</Text>
        <Text style={styles.idValue}>{inspectionId}</Text>
      </View>

      <TouchableOpacity style={styles.pdfButton} onPress={handleOpenPdf}>
        <Text style={styles.pdfButtonText}>Open PDF Report</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.newButton} onPress={onStartNew}>
        <Text style={styles.newButtonText}>Start New Inspection</Text>
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
    color: '#28a745',
  },
  idBox: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
    marginBottom: 32,
    width: '100%',
    alignItems: 'center',
  },
  idLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#555',
    marginBottom: 6,
  },
  idValue: {
    fontSize: 14,
    color: '#111',
    fontFamily: 'monospace',
  },
  pdfButton: {
    backgroundColor: '#007AFF',
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
    backgroundColor: '#f5f5f5',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  newButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
})
