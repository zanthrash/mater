import React from 'react'
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native'
import { useThemeColors, typography } from '../theme'
import type { Asset } from '../services/APIClient'
import { WizardHeader } from '../components/WizardHeader'
import { camelToTitle } from '../utils/formatting'

interface IntakeEvent {
  id: string
  asset_id: string
  created_at: string
  operator_name: string | null
  gps_lat: number | null
  gps_lon: number | null
  ai_analysis_result: Record<string, unknown> | null
  vin_lookup_result: Record<string, unknown> | null
  ai_taxonomy_result: Record<string, unknown> | null
  source_photos: Array<{ url: string; label: string }> | null
}

interface Props {
  asset: Asset
  intakeEvents: IntakeEvent[]
  onBack: () => void
}

function formatDate(isoString: string): string {
  const d = new Date(isoString)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${mm}/${dd}/${yyyy}`
}

function SectionHeader({ title }: { title: string }) {
  const colors = useThemeColors()
  return (
    <Text style={[styles.sectionHeader, { color: colors.primary, fontFamily: typography.headingFamily }]}>
      {title.toUpperCase()}
    </Text>
  )
}

function Row({ label, value }: { label: string; value: string | number | null | undefined }) {
  const colors = useThemeColors()
  if (value == null) return null
  return (
    <View style={[styles.row, { borderBottomColor: colors.separator }]}>
      <Text style={[styles.rowLabel, { color: colors.secondary, fontFamily: typography.bodyFamily }]}>
        {label}
      </Text>
      <Text style={[styles.rowValue, { color: colors.textValue, fontFamily: typography.bodyFamily }]}>
        {String(value)}
      </Text>
    </View>
  )
}

function StackedRow({ label, value, groupBreak }: { label: string; value: string | number | null | undefined; groupBreak?: boolean }) {
  const colors = useThemeColors()
  if (value == null) return null
  return (
    <View style={[styles.stackedRow, groupBreak && styles.stackedRowGroupBreak]}>
      <Text style={[styles.stackedLabel, { color: colors.secondary, fontFamily: typography.bodyFamily }]}>
        {label.toUpperCase()}
      </Text>
      <Text style={[styles.stackedValue, { color: colors.textValue, fontFamily: typography.bodyFamily }]}>
        {String(value)}
      </Text>
    </View>
  )
}

export function AssetDetailScreen({ asset, intakeEvents, onBack }: Props) {
  const colors = useThemeColors()
  const typeSpecificKeys = Object.keys(asset.type_specific_specs ?? {})
  const hasYardMetadata =
    asset.lot_number != null || asset.yard_location != null || asset.consignor != null

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <WizardHeader title="Asset Detail" showBack={true} onBack={onBack} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Photos */}
        {asset.photos.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Photos" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoRow}>
              {asset.photos.map((photo, index) => (
                <View key={index} style={styles.photoItem}>
                  <Image
                    source={{ uri: photo.url }}
                    style={[styles.photo, { borderColor: colors.border }]}
                  />
                  <Text style={[styles.photoLabel, { color: colors.secondary, fontFamily: typography.bodyFamily }]}>
                    {photo.label}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Taxonomy */}
        <View style={[styles.section, styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SectionHeader title="Taxonomy" />
          <Row label="Category" value={asset.category} />
          <Row label="Type" value={asset.type} />
          {asset.subtype != null && <Row label="Subtype" value={asset.subtype} />}
        </View>

        {/* Core Specs */}
        <View style={[styles.section, styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SectionHeader title="Core Specs" />
          <Row label="Make" value={asset.make} />
          <Row label="Model" value={asset.model} />
          <Row label="Year" value={asset.year} />
          <Row label="Engine" value={asset.engine_type} />
          <Row label="Transmission" value={asset.transmission} />
          <Row label="GVW" value={asset.gvw_lbs != null ? `${asset.gvw_lbs} lbs` : null} />
          <Row label="Hours" value={asset.hours_on_meter} />
        </View>

        {/* Type-Specific Specs */}
        {typeSpecificKeys.length > 0 && (
          <View style={[styles.section, styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <SectionHeader title="Type-Specific Specs" />
            {typeSpecificKeys.map((key, index) => (
              <StackedRow
                key={key}
                label={camelToTitle(key)}
                value={asset.type_specific_specs[key]}
                groupBreak={index > 0 && index % 4 === 0}
              />
            ))}
          </View>
        )}

        {/* Yard Metadata */}
        {hasYardMetadata && (
          <View style={[styles.section, styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <SectionHeader title="Yard Metadata" />
            <Row label="Lot Number" value={asset.lot_number} />
            <Row label="Location" value={asset.yard_location} />
            <Row label="Consignor" value={asset.consignor} />
          </View>
        )}

        {/* Intake History */}
        <View style={styles.section}>
          <SectionHeader title="Intake History" />
          {intakeEvents.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.secondary, fontFamily: typography.bodyFamily }]}>
              No intake events recorded.
            </Text>
          ) : (
            intakeEvents.map((event) => (
              <View
                key={event.id}
                style={[styles.intakeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Text style={[styles.intakeOperator, { color: colors.body, fontFamily: typography.headingFamily }]}>
                  {event.operator_name ?? 'Unknown Operator'}
                </Text>
                <Text style={[styles.intakeDate, { color: colors.secondary, fontFamily: typography.bodyFamily }]}>
                  {formatDate(event.created_at)}
                </Text>
                {event.gps_lat != null && (
                  <Text style={[styles.intakeGps, { color: colors.secondary, fontFamily: typography.bodyFamily }]}>
                    GPS: {event.gps_lat}, {event.gps_lon}
                  </Text>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
    paddingTop: 8,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionCard: {
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  sectionHeader: {
    ...typography.label,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: {
    ...typography.body,
    flex: 1,
  },
  rowValue: {
    ...typography.body,
    flex: 2,
    textAlign: 'right',
  },
  photoRow: {
    marginBottom: 4,
  },
  photoItem: {
    marginRight: 12,
    alignItems: 'center',
  },
  photo: {
    width: 120,
    height: 90,
    borderRadius: 8,
    borderWidth: 1,
  },
  photoLabel: {
    ...typography.label,
    marginTop: 4,
    textAlign: 'center',
    maxWidth: 120,
  },
  intakeCard: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  intakeOperator: {
    ...typography.heading,
    marginBottom: 2,
  },
  intakeDate: {
    ...typography.bodySmall,
    marginBottom: 2,
  },
  intakeGps: {
    ...typography.bodySmall,
  },
  emptyText: {
    ...typography.body,
    fontStyle: 'italic',
  },
  stackedRow: {
    paddingVertical: 12,
  },
  stackedRowGroupBreak: {
    marginTop: 16,
  },
  stackedLabel: {
    ...typography.label,
    marginBottom: 3,
  },
  stackedValue: {
    ...typography.body,
  },
})
