import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useThemeColors } from '../theme'
import { useThemeContext } from '../ThemeContext'
import { DropdownMenu } from './DropdownMenu'
import type { MenuItem } from './DropdownMenu'

interface Props {
  title: string
  showBack?: boolean
  onBack?: () => void
  showMenu?: boolean
  onRestart?: () => void
  menuItems?: MenuItem[]
}

export function WizardHeader({
  title,
  showBack = false,
  onBack,
  showMenu = false,
  onRestart,
  menuItems,
}: Props) {
  const colors = useThemeColors()
  const { mode, resolvedScheme, setMode } = useThemeContext()
  const insets = useSafeAreaInsets()
  const [menuVisible, setMenuVisible] = useState(false)
  const [menuAnchor, setMenuAnchor] = useState({ top: 60, right: 16 })

  const themeToggleItem: MenuItem = {
    label: mode === 'system'
      ? resolvedScheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'
      : resolvedScheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode',
    onPress: () => {
      if (resolvedScheme === 'dark') {
        setMode('light')
      } else {
        setMode('dark')
      }
    },
  }

  const restartItem: MenuItem | null = onRestart
    ? {
        label: 'Restart Intake',
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
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 10, borderBottomColor: colors.separator, backgroundColor: colors.background },
      ]}
    >
      <View style={styles.side}>
        {showBack && (
          <TouchableOpacity
            onPress={() => onBack?.()}
            testID="header-back-button"
            accessibilityLabel="Go back"
          >
            <Text style={[styles.backText, { color: colors.primary }]}>← Back</Text>
          </TouchableOpacity>
        )}
      </View>
      <Text
        style={[styles.title, { color: colors.heading }]}
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
            <Text style={[styles.menuText, { color: colors.primary }]}>⋮</Text>
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
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  side: {
    width: 64,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '600',
  },
  backText: {
    fontSize: 16,
  },
  menuButton: {
    alignItems: 'flex-end',
  },
  menuText: {
    fontSize: 24,
  },
})
