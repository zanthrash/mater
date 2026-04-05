import React, { useState, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  Pressable,
  Alert,
  ScrollView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Swipeable } from 'react-native-gesture-handler'
import { useThemeColors, typography } from '../theme'
import { useThemeContext } from '../ThemeContext'
import { useUserContext } from '../UserContext'
import { AnimatedPressableButton } from '../components/AnimatedPressable'
import { PrimaryButton } from '../components/PrimaryButton'
import type { Asset } from '../services/APIClient'

const rbAiLogo = require('../../assets/img/rb-ai-logo-outline.png')

type SortMode = 'newest' | 'oldest' | 'type'

const SORT_OPTIONS: { key: SortMode; label: string }[] = [
  { key: 'newest', label: 'Newest' },
  { key: 'oldest', label: 'Oldest' },
  { key: 'type', label: 'Type A–Z' },
]

const CATEGORY_ICONS: Record<string, string> = {
  earthmoving: 'cog-outline',
  agriculture: 'leaf-outline',
  trucking: 'bus-outline',
  construction: 'hammer-outline',
}

function getCategoryIcon(category: string | null): string {
  if (!category) return 'construct-outline'
  return CATEGORY_ICONS[category.toLowerCase()] ?? 'construct-outline'
}

interface Props {
  assets: Asset[]
  loading: boolean
  onNewIntake: () => void
  onAssetPress: (id: string) => void
  onSearch: (query: string) => void
  onDeleteAsset: (id: string) => void
  onLogout: () => void
  onUserFilter: (userId?: string) => void
  userName: string
}

function formatDate(isoString: string): string {
  const d = new Date(isoString)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${mm}/${dd}/${yyyy}`
}

interface AssetCardProps {
  item: Asset
  onAssetPress: (id: string) => void
  onDeleteAsset: (id: string) => void
}

function DeleteAction({ onPress }: { onPress: () => void }) {
  const colors = useThemeColors()
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.deleteAction, { backgroundColor: colors.error }]}
      accessibilityLabel="Delete asset"
    >
      <Ionicons name="trash-outline" size={22} color="#fff" />
      <Text style={styles.deleteActionLabel}>Delete</Text>
    </TouchableOpacity>
  )
}

function AssetCard({ item, onAssetPress, onDeleteAsset }: AssetCardProps) {
  const colors = useThemeColors()

  const title =
    item.make || item.model || item.year
      ? [item.make, item.model, item.year].filter(Boolean).join(' ')
      : 'Unknown Equipment'
  const taxonomy = [item.category, item.type].filter(Boolean).join(' · ')

  function handleDelete() {
    Alert.alert(
      'Delete Asset?',
      `Remove "${title}" from the list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDeleteAsset(item.id),
        },
      ]
    )
  }

  return (
    <Swipeable
      friction={2}
      rightThreshold={40}
      renderRightActions={() => <DeleteAction onPress={handleDelete} />}
    >
      <AnimatedPressableButton
        testID={`asset-card-${item.id}`}
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => onAssetPress(item.id)}
        accessibilityLabel={`View details for ${title}`}
      >
        {item.photos.length > 0 ? (
          <Image
            source={{ uri: item.photos[0].url }}
            style={[styles.cardPhoto, { backgroundColor: colors.surfaceAlt }]}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.cardPhoto, styles.cardPhotoPlaceholder, { backgroundColor: colors.surfaceAlt }]}>
            <Ionicons
              name={getCategoryIcon(item.category) as any}
              size={40}
              color={colors.placeholder}
            />
          </View>
        )}
        <View style={[styles.cardBody, { borderTopColor: colors.border }]}>
          <Text
            style={[styles.cardTitle, { color: colors.heading, fontFamily: typography.headingFamily }]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {taxonomy ? (
            <Text style={[styles.cardTaxonomy, { color: colors.primary, fontFamily: typography.bodyFamily }]}>
              {taxonomy.toUpperCase()}
            </Text>
          ) : null}
          <View style={styles.cardFooter}>
            {item.lot_number ? (
              <Text style={[styles.cardMeta, { color: colors.secondary, fontFamily: typography.bodyFamily }]}>
                Lot {item.lot_number}
              </Text>
            ) : null}
            <Text style={[styles.cardMeta, { color: colors.secondary, fontFamily: typography.bodyFamily }]}>
              {formatDate(item.created_at)}
            </Text>
          </View>
        </View>
      </AnimatedPressableButton>
    </Swipeable>
  )
}

export function AssetListScreen({ assets, loading, onNewIntake, onAssetPress, onSearch, onDeleteAsset, onLogout, onUserFilter, userName }: Props) {
  const colors = useThemeColors()
  const { resolvedScheme } = useThemeContext()
  const isDark = resolvedScheme === 'dark'
  const insets = useSafeAreaInsets()
  const { user } = useUserContext()
  const [sortMode, setSortMode] = useState<SortMode>('newest')
  const [filterMine, setFilterMine] = useState(false)

  const sortedAssets = useMemo(() => {
    const copy = [...assets]
    if (sortMode === 'oldest') {
      copy.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    } else if (sortMode === 'type') {
      copy.sort((a, b) => {
        const ta = [a.category, a.type].filter(Boolean).join(' ')
        const tb = [b.category, b.type].filter(Boolean).join(' ')
        return ta.localeCompare(tb)
      })
    }
    return copy
  }, [assets, sortMode])

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16, borderBottomColor: colors.borderStrong, backgroundColor: colors.background }]}>
        <View>
          <Image source={rbAiLogo} style={styles.appLogo} resizeMode="contain" accessibilityLabel="rb AI logo" />
          <Text style={[styles.appSubtitle, { color: colors.secondary }]}>Asset Intake</Text>
        </View>
        <AnimatedPressableButton
          testID="new-intake-button"
          onPress={onNewIntake}
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          accessibilityLabel="New intake"
        >
          <Ionicons name="add" size={24} color={colors.onPrimary} />
        </AnimatedPressableButton>
      </View>

      <View style={[styles.userBar, { borderBottomColor: colors.border }]}>
        <Text style={[typography.bodySmall, { color: colors.secondary }]}>
          {userName}
        </Text>
        <Pressable onPress={onLogout} hitSlop={12}>
          <Text style={[typography.bodySmall, { color: colors.primary }]}>Log out</Text>
        </Pressable>
      </View>

      <View style={[styles.searchWrapper, { borderBottomColor: colors.border }]}>
        <Ionicons name="search-outline" size={16} color={colors.placeholder} style={styles.searchIcon} />
        <TextInput
          testID="search-input"
          style={[
            styles.searchInput,
            {
              backgroundColor: 'transparent',
              color: colors.inputText,
              fontFamily: typography.bodyFamily,
            },
          ]}
          placeholder="Search make, model, VIN, lot..."
          placeholderTextColor={colors.placeholder}
          onChangeText={onSearch}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.sortBar, { borderBottomColor: colors.border }]}
        contentContainerStyle={styles.sortBarContent}
      >
        {SORT_OPTIONS.map((opt) => {
          const active = sortMode === opt.key
          return (
            <TouchableOpacity
              key={opt.key}
              onPress={() => setSortMode(opt.key)}
              style={[
                styles.sortChip,
                {
                  backgroundColor: active ? colors.primary : colors.surface,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text
                style={[
                  styles.sortChipText,
                  {
                    color: active ? colors.onPrimary : colors.secondary,
                    fontFamily: typography.bodyFamily,
                  },
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          )
        })}
        <Pressable
          onPress={() => {
            const next = !filterMine
            setFilterMine(next)
            onUserFilter(next && user ? user.id : undefined)
          }}
          style={[
            styles.filterChip,
            {
              backgroundColor: filterMine ? colors.primary : colors.surface,
              borderColor: colors.inputBorder,
            },
          ]}
          hitSlop={8}
        >
          <Text style={[typography.bodySmall, { color: filterMine ? colors.onPrimary : colors.secondary }]}>
            My Assets
          </Text>
        </Pressable>
      </ScrollView>

      {loading ? (
        <ActivityIndicator testID="activity-indicator" style={styles.indicator} size="large" color={colors.primary} />
      ) : assets.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="construct-outline" size={64} color={colors.placeholder} style={styles.emptyIcon} />
          <Text style={[styles.emptyHeading, { color: colors.heading, fontFamily: typography.headingFamily }]}>
            No Assets Yet
          </Text>
          <Text style={[styles.emptyText, { color: colors.secondary, fontFamily: typography.bodyFamily }]}>
            Start your first equipment intake to populate this list.
          </Text>
          <PrimaryButton
            testID="first-asset-button"
            title="Ingest First Asset"
            onPress={onNewIntake}
            icon="add"
            style={styles.emptyButton}
          />
        </View>
      ) : (
        <FlatList
          data={sortedAssets}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <AssetCard item={item} onAssetPress={onAssetPress} onDeleteAsset={onDeleteAsset} />
          )}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  appLogo: {
    height: 54,
    width: 135,
  },
  appSubtitle: {
    fontSize: 13,
    lineHeight: 16,
    fontFamily: typography.headingFamily,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    marginTop: 2,
    marginLeft: 14,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 0,
    borderBottomWidth: 1,
    paddingBottom: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    paddingVertical: 0,
  },
  sortBar: {
    flexGrow: 0,
    flexShrink: 0,
    borderBottomWidth: 1,
  },
  sortBarContent: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 8,
    flexDirection: 'row',
  },
  sortChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginLeft: 8,
  },
  userBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sortChipText: {
    fontSize: 13,
    lineHeight: 18,
  },
  indicator: {
    marginTop: 48,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyHeading: {
    ...typography.title,
    marginBottom: 8,
  },
  emptyText: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: 28,
  },
  emptyButton: {
    paddingHorizontal: 32,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  card: {
    borderRadius: 12,
    marginBottom: 14,
    overflow: 'hidden',
    borderWidth: 1,
  },
  cardPhoto: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  cardPhotoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    padding: 12,
    gap: 4,
    borderTopWidth: 1,
  },
  cardTitle: {
    ...typography.heading,
  },
  cardTaxonomy: {
    ...typography.label,
  },
  cardFooter: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  cardMeta: {
    ...typography.bodySmall,
  },
  deleteAction: {
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    gap: 4,
  },
  deleteActionLabel: {
    color: '#fff',
    ...typography.label,
    letterSpacing: 0.5,
  },
})
