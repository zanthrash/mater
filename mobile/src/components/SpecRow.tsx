import React, { useState, useRef } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native'
import { Swipeable } from 'react-native-gesture-handler'
import { Ionicons } from '@expo/vector-icons'
import { useThemeColors, typography } from '../theme'
import { AIBadge } from './AIBadge'

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true)
}

interface Props {
  specKey: string
  value: string
  isAiPopulated: boolean
  isNewSpec: boolean
  onValueChange: (text: string) => void
  onKeyChange?: (text: string) => void
  onDelete: () => void
  testID?: string
}

export function SpecRow({
  specKey,
  value,
  isAiPopulated,
  isNewSpec,
  onValueChange,
  onKeyChange,
  onDelete,
  testID,
}: Props) {
  const colors = useThemeColors()
  const [expanded, setExpanded] = useState(isNewSpec)
  const [draft, setDraft] = useState(value)
  const swipeableRef = useRef<Swipeable>(null)

  const handleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setDraft(value)
    setExpanded(true)
  }

  const handleDone = () => {
    if (isNewSpec && !specKey.trim()) return
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    onValueChange(draft)
    setExpanded(false)
  }

  const handleCancel = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    if (isNewSpec && !specKey.trim()) {
      onDelete()
      return
    }
    setDraft(value)
    setExpanded(false)
  }

  const renderRightActions = (_progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
    const translateX = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [0, 80],
      extrapolate: 'clamp',
    })
    return (
      <Animated.View style={[styles.deleteAction, { transform: [{ translateX }] }]}>
        <TouchableOpacity
          style={[styles.deleteButton, { backgroundColor: colors.error }]}
          onPress={() => {
            swipeableRef.current?.close()
            onDelete()
          }}
          testID={`${testID}-delete`}
        >
          <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </Animated.View>
    )
  }

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      enabled={!expanded}
      overshootRight={false}
    >
      <View
        style={[
          styles.row,
          {
            backgroundColor: colors.surface,
            borderColor: expanded ? colors.primary : colors.inputBorder,
          },
        ]}
        testID={testID}
      >
        {/* Label row */}
        <View style={styles.labelRow}>
          {isNewSpec ? (
            <TextInput
              style={[styles.keyInput, { color: colors.inputText, borderColor: colors.inputBorder, backgroundColor: colors.inputBg, fontFamily: typography.bodyFamily }]}
              value={specKey}
              onChangeText={onKeyChange}
              placeholder="Spec Name"
              placeholderTextColor={colors.placeholder}
              autoCapitalize="words"
              testID={`${testID}-key`}
            />
          ) : (
            <>
              <Text style={[styles.label, { color: colors.secondary, fontFamily: typography.bodyFamily }]}>
                {specKey.toUpperCase()}
              </Text>
              {isAiPopulated && <AIBadge />}
            </>
          )}
        </View>

        {/* Value */}
        {expanded ? (
          <>
            <TextInput
              style={[
                styles.valueInput,
                {
                  color: colors.inputText,
                  borderColor: colors.primary,
                  backgroundColor: isAiPopulated ? colors.aiBg : colors.inputBg,
                  fontFamily: typography.bodyFamily,
                },
              ]}
              value={draft}
              onChangeText={setDraft}
              multiline
              autoFocus
              placeholder="Value"
              placeholderTextColor={colors.placeholder}
              testID={`${testID}-value-input`}
            />
            <View style={styles.actionRow}>
              <TouchableOpacity onPress={handleCancel} style={styles.actionBtn} testID={`${testID}-cancel`}>
                <Text style={[styles.cancelText, { color: colors.secondary, fontFamily: typography.bodyFamily }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDone} style={styles.actionBtn} testID={`${testID}-done`}>
                <Text style={[styles.doneText, { color: colors.primary, fontFamily: typography.bodyFamily }]}>
                  Done
                </Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <TouchableOpacity onPress={handleExpand} activeOpacity={0.7} testID={`${testID}-value`}>
            <Text
              style={[styles.valueText, { color: colors.inputText, fontFamily: typography.bodyFamily }]}
              numberOfLines={2}
            >
              {value || <Text style={{ color: colors.placeholder }}>Tap to add value</Text>}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </Swipeable>
  )
}

const styles = StyleSheet.create({
  row: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    ...typography.label,
  },
  keyInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    ...typography.bodySmall,
    minHeight: 36,
  },
  valueText: {
    ...typography.body,
  },
  valueInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    ...typography.body,
    minHeight: 44,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  actionBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  cancelText: {
    ...typography.bodySmall,
  },
  doneText: {
    ...typography.bodySmall,
  },
  deleteAction: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 4,
  },
  deleteButton: {
    width: 72,
    height: '100%' as unknown as number,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  deleteText: {
    color: '#FFFFFF',
    ...typography.label,
  },
})
