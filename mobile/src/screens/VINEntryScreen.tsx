import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Button,
  ActivityIndicator,
  StyleSheet,
} from 'react-native'
import { APIClient } from '../services/APIClient'
import type { VinResult } from '../services/APIClient'

interface Props {
  onContinue: (vin: string, vinResult: VinResult | null) => void
}

const client = new APIClient()

export function VINEntryScreen({ onContinue }: Props) {
  const [vin, setVin] = useState('')
  const [vinResult, setVinResult] = useState<VinResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLookup = async () => {
    setLoading(true)
    setError(null)
    setVinResult(null)
    try {
      const result = await client.analyzeVin({ vin })
      setVinResult(result)
    } catch (err) {
      const e = err as { message?: string }
      setError(e.message ?? 'Lookup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>VIN / Serial Number</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter VIN"
        value={vin}
        onChangeText={setVin}
        autoCapitalize="characters"
        autoCorrect={false}
      />

      {error !== null && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {loading && <ActivityIndicator style={styles.spinner} />}

      {vinResult !== null && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultRow}>Make: {vinResult.make ?? '—'}</Text>
          <Text style={styles.resultRow}>Model: {vinResult.model ?? '—'}</Text>
          <Text style={styles.resultRow}>
            Year: {vinResult.year !== null ? String(vinResult.year) : '—'}
          </Text>
          <Text style={styles.resultRow}>
            Source: {vinResult.source === 'nhtsa' ? 'NHTSA' : 'AI'}
          </Text>
        </View>
      )}

      <View style={styles.button}>
        <Button title="Look Up VIN" onPress={handleLookup} disabled={loading || vin.length === 0} />
      </View>

      <View style={styles.button}>
        <Button
          title="Continue"
          onPress={() => onContinue(vin, vinResult)}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 10,
    fontSize: 16,
    marginBottom: 12,
  },
  errorBanner: {
    backgroundColor: '#fdd',
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
  },
  errorText: {
    color: '#c00',
    fontSize: 14,
  },
  spinner: {
    marginBottom: 12,
  },
  resultContainer: {
    backgroundColor: '#f0f4ff',
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
  },
  resultRow: {
    fontSize: 15,
    marginBottom: 4,
  },
  button: {
    marginBottom: 12,
  },
})
