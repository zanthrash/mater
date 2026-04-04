import React, { useEffect, useRef } from 'react'
import { View, Text, Animated, StyleSheet } from 'react-native'
import { useThemeColors, typography } from '../theme'

interface Props {
  currentStep: number
  totalSteps: number
}

export function WizardProgress({ currentStep, totalSteps }: Props) {
  const colors = useThemeColors()
  const pulseAnim = useRef(new Animated.Value(1)).current

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.5, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    )
    animation.start()
    return () => animation.stop()
  }, [])

  return (
    <View style={styles.container}>
      <View style={styles.segmentsRow}>
        {Array.from({ length: totalSteps }).map((_, i) => {
          const isCompleted = i < currentStep - 1
          const isCurrent = i === currentStep - 1

          if (isCurrent) {
            return (
              <Animated.View
                key={i}
                style={[
                  styles.segmentBase,
                  i < totalSteps - 1 && styles.segmentGap,
                  { backgroundColor: colors.primary, opacity: pulseAnim },
                ]}
              />
            )
          }
          return (
            <View
              key={i}
              style={[
                styles.segmentBase,
                i < totalSteps - 1 && styles.segmentGap,
                { backgroundColor: isCompleted ? colors.primary : colors.border },
              ]}
            />
          )
        })}
      </View>
      <Text style={[styles.label, { color: colors.secondary, fontFamily: typography.bodyFamily }]}>
        {`STEP ${currentStep} OF ${totalSteps}`}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 4,
  },
  segmentsRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  segmentBase: {
    flex: 1,
    height: 5,
    borderRadius: 3,
  },
  segmentGap: {
    marginRight: 4,
  },
  label: {
    ...typography.label,
  },
})
