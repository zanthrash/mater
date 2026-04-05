import React, { useState } from 'react'
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useThemeColors, typography } from '../theme'
import { AIBadge } from './AIBadge'
import type { TaxonomyCategoryNode } from '../services/APIClient'

interface TaxonomyValue {
  category: string
  type: string
  subtype: string | null
}

interface Props {
  taxonomyTree: TaxonomyCategoryNode[]
  value: TaxonomyValue
  onChange: (val: TaxonomyValue) => void
  isAiPopulated?: boolean
}

type Level = 'category' | 'type' | 'subtype'

export function TaxonomyPicker({ taxonomyTree, value, onChange, isAiPopulated }: Props) {
  const colors = useThemeColors()
  const [visible, setVisible] = useState(false)
  const [level, setLevel] = useState<Level>('category')
  const [pendingCategory, setPendingCategory] = useState<string>('')
  const [pendingType, setPendingType] = useState<string>('')

  function open() {
    setLevel('category')
    setPendingCategory('')
    setPendingType('')
    setVisible(true)
  }

  function close() {
    setVisible(false)
  }

  function selectCategory(cat: string) {
    setPendingCategory(cat)
    setLevel('type')
  }

  function selectType(type: string) {
    const catNode = taxonomyTree.find((c) => c.category === pendingCategory)
    const typeNode = catNode?.types.find((t) => t.type === type)
    if (!typeNode || typeNode.subtypes.length === 0) {
      onChange({ category: pendingCategory, type, subtype: null })
      close()
      return
    }
    setPendingType(type)
    setLevel('subtype')
  }

  function selectSubtype(subtype: string) {
    onChange({ category: pendingCategory, type: pendingType, subtype })
    close()
  }

  function goBack() {
    if (level === 'type') setLevel('category')
    else if (level === 'subtype') setLevel('type')
  }

  const currentTypes = taxonomyTree.find((c) => c.category === pendingCategory)?.types ?? []
  const currentSubtypes =
    currentTypes.find((t) => t.type === pendingType)?.subtypes ?? []

  const levelTitle = level === 'category' ? 'Category' : level === 'type' ? 'Type' : 'Subtype'
  const items =
    level === 'category'
      ? taxonomyTree.map((c) => c.category)
      : level === 'type'
        ? currentTypes.map((t) => t.type)
        : currentSubtypes

  const displayText = [value.category, value.type, value.subtype].filter(Boolean).join(' › ')

  return (
    <>
      <TouchableOpacity
        testID="taxonomy-picker-display"
        style={[styles.display, { borderColor: colors.inputBorder, backgroundColor: isAiPopulated ? colors.aiBg : colors.inputBg }]}
        onPress={open}
        accessibilityRole="button"
      >
        <Text style={[typography.body, { color: colors.inputText, flex: 1 }]}>{displayText}</Text>
        {isAiPopulated && (
          <View testID="ai-badge">
            <AIBadge />
          </View>
        )}
        <Ionicons name="chevron-down" size={16} color={colors.secondary} style={styles.chevron} />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
        <View style={styles.overlay}>
          <SafeAreaView style={[styles.sheet, { backgroundColor: colors.surface }]}>
            {/* Header */}
            <View style={[styles.sheetHeader, { borderBottomColor: colors.separator }]}>
              {level !== 'category' ? (
                <TouchableOpacity testID="picker-back-button" onPress={goBack} style={styles.backBtn}>
                  <Ionicons name="chevron-back" size={20} color={colors.primary} />
                </TouchableOpacity>
              ) : (
                <View style={styles.backBtn} />
              )}
              <Text style={[typography.heading, { color: colors.heading }]}>{levelTitle}</Text>
              <TouchableOpacity onPress={close} style={styles.backBtn}>
                <Ionicons name="close" size={20} color={colors.secondary} />
              </TouchableOpacity>
            </View>

            {/* List */}
            <FlatList
              data={items}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.row, { borderBottomColor: colors.separator }]}
                  onPress={() => {
                    if (level === 'category') selectCategory(item)
                    else if (level === 'type') selectType(item)
                    else selectSubtype(item)
                  }}
                >
                  <Text style={[typography.body, { color: colors.body }]}>{item}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.secondary} />
                </TouchableOpacity>
              )}
            />
          </SafeAreaView>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  display: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 11,
    paddingHorizontal: 12,
    minHeight: 44,
  },
  chevron: {
    marginLeft: 8,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 36,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    minHeight: 52,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
})
