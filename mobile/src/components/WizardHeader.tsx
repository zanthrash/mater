import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { useThemeColors } from '../theme'

interface Props {
  title: string
  showBack?: boolean
  onBack?: () => void
  showMenu?: boolean
  onRestart?: () => void
}

export function WizardHeader({
  title,
  showBack = false,
  onBack,
  showMenu = false,
  onRestart,
}: Props) {
  const colors = useThemeColors()

  function handleMenuPress() {
    Alert.alert(
      'Restart Inspection',
      'All progress will be lost. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Yes, Restart', style: 'destructive', onPress: onRestart },
      ]
    )
  }

  return (
    <View
      style={[
        styles.container,
        { borderBottomColor: colors.separator, backgroundColor: colors.background },
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
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 52,
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
