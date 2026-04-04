import React, { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Animated } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useThemeColors, typography } from '../theme'
import { PrimaryButton } from '../components/PrimaryButton'

interface Props {
  assetId: string
  assetSummary: { make: string | null; model: string | null; category: string | null; type: string | null }
  onStartNew: () => void
  onViewInList: () => void
}

export function SubmitScreen({ assetId, assetSummary, onStartNew, onViewInList }: Props) {
  const colors = useThemeColors()
  const insets = useSafeAreaInsets()
  const iconScale = useRef(new Animated.Value(0)).current
  const iconOpacity = useRef(new Animated.Value(0)).current
  const contentOpacity = useRef(new Animated.Value(0)).current
  const contentTranslateY = useRef(new Animated.Value(20)).current

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(iconOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(iconScale, { toValue: 1, useNativeDriver: true, bounciness: 12, speed: 8 }),
      ]),
      Animated.parallel([
        Animated.timing(contentOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(contentTranslateY, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]),
    ]).start()
  }, [])

  const equipmentName = [assetSummary.make, assetSummary.model].filter(Boolean).join(' ') || 'Unknown Equipment'
  const taxonomyLine = [assetSummary.category, assetSummary.type].filter(Boolean).join(' · ')

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <Animated.View style={[styles.iconWrapper, { transform: [{ scale: iconScale }], opacity: iconOpacity }]}>
        <View style={[styles.iconCircle, { backgroundColor: `${colors.success}20` }]}>
          <Ionicons name="checkmark-circle" size={80} color={colors.success} />
        </View>
      </Animated.View>

      <Animated.View style={[styles.content, { opacity: contentOpacity, transform: [{ translateY: contentTranslateY }] }]}>
        <Text style={[styles.title, { color: colors.success, fontFamily: typography.headingFamily }]}>
          ASSET INGESTED
        </Text>

        <View style={[styles.idBox, { backgroundColor: colors.surface, borderTopColor: colors.primary, borderColor: colors.border }]}>
          <Text style={[styles.idLabel, { color: colors.secondary, fontFamily: typography.bodyFamily }]}>
            ASSET ID
          </Text>
          <Text style={[styles.idValue, { color: colors.textValue }]}>
            {assetId}
          </Text>
        </View>

        {(equipmentName || taxonomyLine) && (
          <View style={[styles.summaryBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.summaryText, { color: colors.heading, fontFamily: typography.headingFamily }]}>
              {equipmentName}
            </Text>
            {taxonomyLine ? (
              <Text style={[styles.summaryTaxonomy, { color: colors.primary, fontFamily: typography.bodyFamily }]}>
                {taxonomyLine.toUpperCase()}
              </Text>
            ) : null}
          </View>
        )}

        <PrimaryButton
          title="View in List"
          onPress={onViewInList}
          icon="list"
          style={styles.primaryButton}
        />
        <PrimaryButton
          title="Ingest Another"
          onPress={onStartNew}
          variant="secondary"
          icon="add"
          style={styles.secondaryButton}
        />
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  iconWrapper: {
    marginBottom: 24,
  },
  iconCircle: {
    width: 128,
    height: 128,
    borderRadius: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    width: '100%',
    alignItems: 'center',
  },
  title: {
    ...typography.title,
    marginBottom: 28,
    textAlign: 'center',
  },
  idBox: {
    borderRadius: 10,
    borderWidth: 1,
    borderTopWidth: 3,
    padding: 16,
    marginBottom: 12,
    width: '100%',
    alignItems: 'center',
  },
  idLabel: {
    ...typography.caption,
    marginBottom: 6,
  },
  idValue: {
    ...typography.body,
    fontFamily: 'monospace',
  },
  summaryBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 16,
    marginBottom: 28,
    width: '100%',
    alignItems: 'center',
    gap: 4,
  },
  summaryText: {
    ...typography.heading,
  },
  summaryTaxonomy: {
    ...typography.caption,
  },
  primaryButton: {
    width: '100%',
    marginBottom: 10,
  },
  secondaryButton: {
    width: '100%',
  },
})
