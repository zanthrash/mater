import React from 'react'
import { View, Text, ActivityIndicator, StyleSheet, ViewStyle, StyleProp } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { AnimatedPressableButton } from './AnimatedPressable'
import { useThemeColors, typography } from '../theme'

type Variant = 'primary' | 'secondary' | 'destructive'

interface Props {
  title: string
  onPress: () => void
  variant?: Variant
  disabled?: boolean
  loading?: boolean
  icon?: string
  style?: StyleProp<ViewStyle>
  testID?: string
}

export function PrimaryButton({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  icon,
  style,
  testID,
}: Props) {
  const colors = useThemeColors()

  const bgColor = disabled
    ? colors.buttonDisabledBg
    : variant === 'primary'
    ? colors.primary
    : variant === 'destructive'
    ? colors.error
    : colors.secondaryButtonBg

  const textColor = disabled
    ? colors.buttonDisabledText
    : variant === 'secondary'
    ? colors.secondaryButtonText
    : colors.onPrimary

  const borderStyle =
    variant === 'secondary'
      ? { borderWidth: 1, borderColor: colors.secondaryButtonBorder }
      : {}

  return (
    <AnimatedPressableButton
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.button, { backgroundColor: bgColor }, borderStyle, style]}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <View style={styles.content}>
          {icon && (
            <Ionicons
              name={icon as any}
              size={18}
              color={textColor}
            />
          )}
          <Text style={[styles.text, { color: textColor, fontFamily: typography.headingFamily }]}>
            {title}
          </Text>
        </View>
      )}
    </AnimatedPressableButton>
  )
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  text: {
    ...typography.button,
  },
})
