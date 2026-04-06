import React, { useEffect, useRef } from 'react'
import { View, Animated, StyleSheet } from 'react-native'
import { useThemeColors } from '../theme'

interface Props {
  rows?: number
}

function SkeletonRow() {
  const colors = useThemeColors()
  const shimmer = useRef(new Animated.Value(0.4)).current

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0.4, duration: 600, useNativeDriver: true }),
      ])
    )
    animation.start()
    return () => animation.stop()
  }, [])

  return (
    <Animated.View style={[styles.row, { borderBottomColor: colors.separator, opacity: shimmer }]}>
      <View style={[styles.circle, { backgroundColor: colors.border }]} />
      <View style={[styles.textBar, { backgroundColor: colors.surface }]} />
      <View style={[styles.button, { backgroundColor: colors.surface }]} />
    </Animated.View>
  )
}

export function ChecklistSkeleton({ rows = 5 }: Props) {
  return (
    <View testID="checklist-skeleton">
      {Array.from({ length: rows }, (_, i) => (
        <SkeletonRow key={i} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  circle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    flexShrink: 0,
  },
  textBar: {
    flex: 1,
    height: 14,
    borderRadius: 4,
    marginRight: 8,
  },
  button: {
    width: 76,
    height: 34,
    borderRadius: 8,
  },
})
