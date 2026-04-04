import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { APIClient, VinResult } from '../services/APIClient'
import { VINScannerScreen } from './VINScannerScreen'
import { WizardHeader } from '../components/WizardHeader'
import { FormInput } from '../components/FormInput'
import { PrimaryButton } from '../components/PrimaryButton'
import { useThemeColors, typography } from '../theme'

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
    setError("Couldn't read VIN — please enter manually")
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
    <View style={[styles.outerContainer, { backgroundColor: colors.background }]}>
      <WizardHeader
        title="VIN / Serial"
        showBack
        onBack={onBack}
        showMenu
        onRestart={onRestart}
        stepInfo={{ current: 2, total: 5 }}
      />
      <View style={styles.container}>
        <FormInput
          label="VIN Number"
          value={vin}
          onChangeText={setVin}
          placeholder="Enter VIN or serial number"
          autoCapitalize="characters"
          autoCorrect={false}
        />

        {error !== null && (
          <View style={[styles.errorBanner, { backgroundColor: colors.errorBg }]}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.error} style={styles.errorIcon} />
            <Text style={[styles.errorText, { color: colors.error, fontFamily: typography.bodyFamily }]}>
              {error}
            </Text>
          </View>
        )}

        {loading && <ActivityIndicator style={styles.spinner} color={colors.primary} />}

        {vinResult !== null && (
          <View style={[styles.resultContainer, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
            <Text style={[styles.resultHeading, { color: colors.primary, fontFamily: typography.headingFamily }]}>
              VIN LOOKUP RESULT
            </Text>
            <ResultRow label="Make" value={vinResult.make ?? '—'} />
            <ResultRow label="Model" value={vinResult.model ?? '—'} />
            <ResultRow label="Year" value={vinResult.year !== null ? String(vinResult.year) : '—'} />
            <ResultRow label="Source" value={vinResult.source === 'nhtsa' ? 'NHTSA' : 'AI'} />
          </View>
        )}

        <View style={styles.actionRow}>
          <PrimaryButton
            title="Look Up VIN"
            onPress={handleLookup}
            disabled={loading || vin.length === 0}
            icon="search"
            style={styles.halfButton}
          />
          <PrimaryButton
            title="Scan VIN"
            onPress={() => setScannerOpen(true)}
            disabled={loading}
            variant="secondary"
            icon="scan"
            style={styles.halfButton}
          />
        </View>

        <PrimaryButton
          title="Continue"
          onPress={() => onContinue(vin, vinResult)}
          icon="arrow-forward"
          style={styles.continueButton}
        />
      </View>
    </View>
  )
}

function ResultRow({ label, value }: { label: string; value: string }) {
  const colors = useThemeColors()
  return (
    <View style={[styles.resultRow, { borderBottomColor: colors.separator }]}>
      <Text style={[styles.resultLabel, { color: colors.secondary, fontFamily: typography.bodyFamily }]}>
        {label.toUpperCase()}
      </Text>
      <Text style={[styles.resultValue, { color: colors.textValue, fontFamily: typography.bodyFamily }]}>
        {value}
      </Text>
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
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  errorIcon: {
    marginRight: 8,
  },
  errorText: {
    ...typography.body,
    flex: 1,
  },
  spinner: {
    marginBottom: 12,
  },
  resultContainer: {
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
  },
  resultHeading: {
    ...typography.caption,
    marginBottom: 10,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  resultLabel: {
    ...typography.label,
  },
  resultValue: {
    ...typography.body,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  halfButton: {
    flex: 1,
    paddingHorizontal: 8,
  },
  continueButton: {
    marginTop: 4,
  },
})
