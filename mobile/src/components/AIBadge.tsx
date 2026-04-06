import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useThemeColors, typography } from '../theme'

export function AIBadge() {
  const colors = useThemeColors()

  return (
    <View style={[styles.badge, { backgroundColor: colors.aiBadgeBg }]}>
      <Ionicons name="sparkles" size={12} color={colors.aiAccent} />
      <Text style={[styles.text, { color: colors.aiBadgeText, fontFamily: typography.bodyFamily }]}>
        AI
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  text: {
    ...typography.caption,
  },
})
