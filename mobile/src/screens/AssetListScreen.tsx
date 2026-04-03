import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Image,
  ActivityIndicator,
} from 'react-native'
import { useThemeColors } from '../theme'
import type { Asset } from '../services/APIClient'

interface Props {
  assets: Asset[]
  loading: boolean
  onNewIntake: () => void
  onAssetPress: (id: string) => void
  onSearch: (query: string) => void
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
}

function AssetCard({ item, onAssetPress }: AssetCardProps) {
  const colors = useThemeColors()
  const title =
    item.make || item.model || item.year
      ? [item.make, item.model, item.year].filter(Boolean).join(' ')
      : 'Unknown Equipment'
  const taxonomy = [item.category, item.type].filter(Boolean).join(' > ')

  return (
    <TouchableOpacity
      testID={`asset-card-${item.id}`}
      style={[styles.card, { backgroundColor: colors.surface }]}
      onPress={() => onAssetPress(item.id)}
    >
      {item.photos.length > 0 && (
        <Image
          source={{ uri: item.photos[0].url }}
          style={styles.thumbnail}
        />
      )}
      <View style={styles.cardBody}>
        <Text style={[styles.cardTitle, { color: colors.heading }]}>{title}</Text>
        {taxonomy ? (
          <Text style={[styles.cardSecondary, { color: colors.secondary }]}>{taxonomy}</Text>
        ) : null}
        {item.lot_number ? (
          <Text style={[styles.cardSecondary, { color: colors.secondary }]}>
            Lot: {item.lot_number}
          </Text>
        ) : null}
        <Text style={[styles.cardSecondary, { color: colors.secondary }]}>
          {formatDate(item.created_at)}
        </Text>
      </View>
    </TouchableOpacity>
  )
}

export function AssetListScreen({ assets, loading, onNewIntake, onAssetPress, onSearch }: Props) {
  const colors = useThemeColors()

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.appTitle, { color: colors.title }]}>Mater</Text>
        <TouchableOpacity
          testID="new-intake-button"
          onPress={onNewIntake}
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          accessibilityLabel="New intake"
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        testID="search-input"
        style={[
          styles.searchInput,
          {
            backgroundColor: colors.inputBg,
            borderColor: colors.inputBorder,
            color: colors.inputText,
          },
        ]}
        placeholder="Search by make, model, VIN, lot..."
        placeholderTextColor={colors.placeholder}
        onChangeText={onSearch}
      />

      {loading ? (
        <ActivityIndicator testID="activity-indicator" style={styles.indicator} size="large" color={colors.primary} />
      ) : assets.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: colors.secondary }]}>
            No assets ingested yet
          </Text>
          <TouchableOpacity
            testID="first-asset-button"
            style={[styles.firstAssetButton, { backgroundColor: colors.primary }]}
            onPress={onNewIntake}
          >
            <Text style={styles.firstAssetButtonText}>Ingest Your First Asset</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={assets}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <AssetCard item={item} onAssetPress={onAssetPress} />
          )}
          contentContainerStyle={styles.listContent}
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
    padding: 16,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 24,
    lineHeight: 28,
  },
  searchInput: {
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 15,
  },
  indicator: {
    marginTop: 48,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    marginBottom: 16,
  },
  firstAssetButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  firstAssetButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  card: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 4,
  },
  cardBody: {
    flex: 1,
    marginLeft: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  cardSecondary: {
    fontSize: 13,
    marginTop: 2,
  },
})
