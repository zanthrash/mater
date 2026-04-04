import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useThemeColors, typography } from '../theme'
import { useThemeContext } from '../ThemeContext'
import { DropdownMenu } from './DropdownMenu'
import { WizardProgress } from './WizardProgress'
import type { MenuItem } from './DropdownMenu'

interface Props {
  title: string
  showBack?: boolean
  onBack?: () => void
  showMenu?: boolean
  onRestart?: () => void
  menuItems?: MenuItem[]
  stepInfo?: { current: number; total: number }
}

export function WizardHeader({
  title,
  showBack = false,
  onBack,
  showMenu = false,
  onRestart,
  menuItems,
  stepInfo,
}: Props) {
  const colors = useThemeColors()
  const { mode, resolvedScheme, setMode } = useThemeContext()
  const insets = useSafeAreaInsets()
  const [menuVisible, setMenuVisible] = useState(false)
  const [menuAnchor, setMenuAnchor] = useState({ top: 60, right: 16 })

  const themeToggleItem: MenuItem = {
    label: resolvedScheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode',
    icon: resolvedScheme === 'dark' ? 'sunny' : 'moon',
    onPress: () => {
      setMode(resolvedScheme === 'dark' ? 'light' : 'dark')
    },
  }

  const restartItem: MenuItem | null = onRestart
    ? {
        label: 'Restart Intake',
        icon: 'refresh-circle',
        destructive: true,
        onPress: () => {
          Alert.alert(
            'Restart Intake',
            'Discard current progress and start over?',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Yes, Restart', style: 'destructive', onPress: onRestart },
            ]
          )
        },
      }
    : null

  const resolvedItems: MenuItem[] =
    menuItems ??
    [themeToggleItem, ...(restartItem ? [restartItem] : [])]

  function handleMenuPress(event: any) {
    const { pageY } = event.nativeEvent
    setMenuAnchor({ top: pageY + 8, right: 16 })
    setMenuVisible(true)
  }

  return (
    <View style={{ backgroundColor: colors.background }}>
      <View
        style={[
          styles.container,
          {
            paddingTop: insets.top + 10,
            borderBottomColor: stepInfo ? 'transparent' : colors.borderStrong,
            backgroundColor: colors.background,
          },
        ]}
      >
        <View style={styles.side}>
          {showBack && (
            <TouchableOpacity
              onPress={() => onBack?.()}
              testID="header-back-button"
              accessibilityLabel="Go back"
              style={styles.backButton}
            >
              <Ionicons name="chevron-back" size={20} color={colors.primary} />
              <Text style={[styles.backText, { color: colors.primary, fontFamily: typography.bodyFamily }]}>
                Back
              </Text>
            </TouchableOpacity>
          )}
        </View>
        <Text
          style={[styles.title, { color: colors.heading, fontFamily: typography.headingFamily }]}
          numberOfLines={1}
        >
          {title}
        </Text>
        <View style={styles.side}>
          {showMenu && (
            <TouchableOpacity
              onPress={handleMenuPress}
              testID="header-menu-button"
              accessibilityLabel="More options"
              style={styles.menuButton}
            >
              <Ionicons name="ellipsis-vertical" size={20} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>

        <DropdownMenu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          items={resolvedItems}
          anchorPosition={menuAnchor}
        />
      </View>

      {stepInfo && (
        <WizardProgress currentStep={stepInfo.current} totalSteps={stepInfo.total} />
      )}

      {!stepInfo && (
        <View style={[styles.divider, { backgroundColor: colors.borderStrong }]} />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    paddingHorizontal: 16,
  },
  divider: {
    height: 1,
  },
  side: {
    width: 72,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    ...typography.heading,
  },
  backText: {
    ...typography.body,
  },
  menuButton: {
    alignItems: 'flex-end',
  },
})
