import React, { useEffect, useRef } from 'react'
import { View, Text, ActivityIndicator, Animated, StyleSheet } from 'react-native'
import { useThemeColors, typography } from '../theme'

interface Props {
  message?: string
}

export function AiAnalysisBanner({ message = 'AI is analyzing your photos...' }: Props) {
  const colors = useThemeColors()
  const pulse = useRef(new Animated.Value(0.6)).current

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.6, duration: 900, useNativeDriver: true }),
      ])
    )
    animation.start()
    return () => animation.stop()
  }, [])

  return (
    <Animated.View
      style={[
        styles.banner,
        { backgroundColor: colors.surfaceAlt, borderLeftColor: colors.primary, opacity: pulse },
      ]}
      testID="ai-analysis-banner"
    >
      <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 8 }} />
      <Text style={[styles.text, { color: colors.primary, fontFamily: typography.bodyFamily }]}>
        {message}
      </Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 3,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  text: {
    ...typography.body,
    flex: 1,
  },
})
