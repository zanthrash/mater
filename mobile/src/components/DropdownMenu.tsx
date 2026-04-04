import React from 'react'
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useThemeColors, typography } from '../theme'

export interface MenuItem {
  label: string
  onPress: () => void
  destructive?: boolean
  icon?: string
}

interface Props {
  visible: boolean
  onDismiss: () => void
  items: MenuItem[]
  anchorPosition?: { top: number; right: number }
}

export function DropdownMenu({ visible, onDismiss, items, anchorPosition }: Props) {
  const colors = useThemeColors()

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onDismiss}>
      <TouchableWithoutFeedback onPress={onDismiss}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.menu,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.borderStrong,
                  top: anchorPosition?.top ?? 60,
                  right: anchorPosition?.right ?? 16,
                },
              ]}
            >
              {items.map((item, index) => (
                <React.Fragment key={item.label}>
                  {index > 0 && <View style={[styles.separator, { backgroundColor: colors.separator }]} />}
                  <TouchableOpacity
                    style={styles.item}
                    onPress={() => {
                      onDismiss()
                      item.onPress()
                    }}
                  >
                    {item.icon && (
                      <Ionicons
                        name={item.icon as any}
                        size={16}
                        color={item.destructive ? colors.error : colors.secondary}
                        style={styles.itemIcon}
                      />
                    )}
                    <Text
                      style={[
                        styles.itemText,
                        { color: item.destructive ? colors.error : colors.body, fontFamily: typography.bodyFamily },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                </React.Fragment>
              ))}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  menu: {
    position: 'absolute',
    minWidth: 200,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
    overflow: 'hidden',
  },
  item: {
    paddingVertical: 13,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemIcon: {
    marginRight: 10,
  },
  itemText: {
    ...typography.body,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
})
