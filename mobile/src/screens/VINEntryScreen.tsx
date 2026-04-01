import React, { useState, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  TextInput,
  Button,
  ActivityIndicator,
  StyleSheet,
} from 'react-native'
import { APIClient, VinResult } from '../services/APIClient'
import { VINScannerScreen } from './VINScannerScreen'
import { WizardHeader } from '../components/WizardHeader'
import { useThemeColors } from '../theme'

interface Props {
  client?: APIClient
  onContinue: (vin: string, vinResult: VinResult | null) => void
  onBack?: () => void
  onRestart?: () => void
}

export function VINEntryScreen({ client = new APIClient(), onContinue, onBack, onRestart }: Props) {
  const colors = useThemeColors()
  const [vin, setVin] = useState('')
  const [vinResult, setVinResult] = useState<VinResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scannerOpen, setScannerOpen] = useState(false)

  const themed = useMemo(() => ({
    title: { color: colors.title },
    input: {
      borderColor: colors.inputBorder,
      color: colors.inputText,
      backgroundColor: colors.inputBg,
    },
    errorBanner: { backgroundColor: colors.errorBg },
    errorText: { color: colors.error },
    resultContainer: { backgroundColor: colors.surfaceAlt },
    resultRow: { color: colors.body },
  }), [colors])

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

  const handleVinScanned = useCallback((scannedVin: string) => {
    setVin(scannedVin)
    setScannerOpen(false)
    setError(null)
    setVinResult(null)
  }, [])

  const handleScannerCancel = useCallback(() => {
    setScannerOpen(false)
    setError("Couldn't read VIN \u2014 please enter manually")
  }, [])

  if (scannerOpen) {
    return (
      <VINScannerScreen
        onVinScanned={handleVinScanned}
        onCancel={handleScannerCancel}
        client={client}
      />
    )
  }

  return (
    <View style={styles.outerContainer}>
      <WizardHeader title="VIN / Serial Number" showBack onBack={onBack} showMenu onRestart={onRestart} />
      <View style={styles.container}>
      <TextInput
        style={[styles.input, themed.input]}
        placeholder="Enter VIN"
        placeholderTextColor={colors.placeholder}
        value={vin}
        onChangeText={setVin}
        autoCapitalize="characters"
        autoCorrect={false}
      />

      {error !== null && (
        <View style={[styles.errorBanner, themed.errorBanner]}>
          <Text style={[styles.errorText, themed.errorText]}>{error}</Text>
        </View>
      )}

      {loading && <ActivityIndicator style={styles.spinner} />}

      {vinResult !== null && (
        <View style={[styles.resultContainer, themed.resultContainer]}>
          <Text style={[styles.resultRow, themed.resultRow]}>Make: {vinResult.make ?? '\u2014'}</Text>
          <Text style={[styles.resultRow, themed.resultRow]}>Model: {vinResult.model ?? '\u2014'}</Text>
          <Text style={[styles.resultRow, themed.resultRow]}>
            Year: {vinResult.year !== null ? String(vinResult.year) : '\u2014'}
          </Text>
          <Text style={[styles.resultRow, themed.resultRow]}>
            Source: {vinResult.source === 'nhtsa' ? 'NHTSA' : 'AI'}
          </Text>
        </View>
      )}

      <View style={styles.buttonRow}>
        <View style={styles.buttonHalf}>
          <Button title="Look Up VIN" onPress={handleLookup} disabled={loading || vin.length === 0} />
        </View>
        <View style={styles.buttonHalf}>
          <Button title="Scan VIN" onPress={() => setScannerOpen(true)} disabled={loading} />
        </View>
      </View>

      <View style={styles.button}>
        <Button
          title="Continue"
          onPress={() => onContinue(vin, vinResult)}
        />
      </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
  },
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
    borderRadius: 6,
    padding: 10,
    fontSize: 16,
    marginBottom: 12,
  },
  errorBanner: {
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 14,
  },
  spinner: {
    marginBottom: 12,
  },
  resultContainer: {
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
  },
  resultRow: {
    fontSize: 15,
    marginBottom: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 12,
  },
  buttonHalf: {
    flex: 1,
  },
  button: {
    marginBottom: 12,
  },
})
