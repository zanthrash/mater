import React, { useRef } from 'react'
import { Pressable, Animated, ViewStyle, StyleProp } from 'react-native'

interface Props {
  onPress?: () => void
  style?: StyleProp<ViewStyle>
  children: React.ReactNode
  disabled?: boolean
  testID?: string
  accessibilityLabel?: string
}

export function AnimatedPressableButton({
  onPress,
  style,
  children,
  disabled,
  testID,
  accessibilityLabel,
}: Props) {
  const scale = useRef(new Animated.Value(1)).current

  const onPressIn = () => {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 4 }).start()
  }

  const onPressOut = () => {
    Animated.spring(scale, { toValue: 1.0, useNativeDriver: true, speed: 50, bounciness: 4 }).start()
  }

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={onPress}
        disabled={disabled}
        testID={testID}
        accessibilityLabel={accessibilityLabel}
      >
        {children}
      </Pressable>
    </Animated.View>
  )
}
