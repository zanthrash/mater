import React from 'react'
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
} from 'react-native'
import { useThemeColors } from '../theme'

export interface MenuItem {
  label: string
  onPress: () => void
  destructive?: boolean
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
                  borderColor: colors.border,
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
                    <Text
                      style={[
                        styles.itemText,
                        { color: item.destructive ? colors.error : colors.body },
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
    minWidth: 180,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  item: {
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  itemText: {
    fontSize: 16,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
})
