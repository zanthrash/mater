import React, { useState } from 'react'
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native'
import { useThemeColors, typography } from '../theme'
import { AIBadge } from './AIBadge'

interface Props extends TextInputProps {
  label: string
  isAiPopulated?: boolean
}

export function FormInput({ label, isAiPopulated, style, ...inputProps }: Props) {
  const colors = useThemeColors()
  const [focused, setFocused] = useState(false)

  const borderColor = focused ? colors.primary : colors.inputBorder
  const bgColor = isAiPopulated ? colors.aiBg : colors.inputBg

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: colors.secondary, fontFamily: typography.bodyFamily }]}>
          {label.toUpperCase()}
        </Text>
        {isAiPopulated && <AIBadge />}
      </View>
      <TextInput
        {...inputProps}
        style={[
          styles.input,
          {
            backgroundColor: bgColor,
            borderColor,
            color: colors.inputText,
            fontFamily: typography.bodyFamily,
          },
          style,
        ]}
        placeholderTextColor={colors.placeholder}
        onFocus={(e) => {
          setFocused(true)
          inputProps.onFocus?.(e)
        }}
        onBlur={(e) => {
          setFocused(false)
          inputProps.onBlur?.(e)
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  label: {
    ...typography.label,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 11,
    paddingHorizontal: 12,
    ...typography.body,
    minHeight: 44,
  },
})
