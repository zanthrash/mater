export interface DashboardStats {
  intakeCount: number
  intakeCountPrevious: number
  activeOperators: number
  totalOperators: number
  needsReviewCount: number
  needsReviewBreakdown: { lowConfidence: number; missingFields: number }
  avgConfidence: number
}

export interface IntakeVolumeBucket {
  label: string
  count: number
}

export interface CategoryCount {
  category: string
  count: number
}

export interface OperatorStats {
  id: string
  displayName: string
  email: string
  intakeCount: number
  avgConfidence: number
  flaggedCount: number
  lastIntakeAt: string | null
  isActive: boolean
}

export interface AiInsights {
  avgClassificationConfidence: number
  avgSpecConfidence: number
  overrideRate: number
  vinMatchRate: number
  confidenceTrend: Array<{ date: string; classification: number; spec: number }>
  confidenceDistribution: Array<{ bucket: string; count: number }>
  misclassifications: Array<{ aiCategory: string; actualCategory: string; count: number }>
  categoryAccuracy: Array<{ category: string; avgConfidence: number }>
  vinAgreement: { make: number; model: number; year: number; engineType: number; gvw: number }
  vinSources: { nhtsa: number; claude: number; none: number }
}

export interface ActivityEvent {
  id: string
  type: string
  operatorName: string
  assetId: string
  assetName: string
  category: string
  confidence: number | null
  status: string
  createdAt: string
  photoCount: number
}

export interface Asset {
  id: string
  created_at: string
  updated_at: string
  vin_serial: string | null
  category: string | null
  type: string | null
  subtype: string | null
  make: string | null
  model: string | null
  year: number | null
  engine_type: string | null
  transmission: string | null
  gvw_lbs: number | null
  hours_on_meter: number | null
  type_specific_specs: Record<string, string | number | null>
  lot_number: string | null
  yard_location: string | null
  consignor: string | null
  photos: Array<{ url: string; label: string; type: 'guided' | 'extra' }>
  voice_notes: Array<{ url: string; transcript: string | null; duration_seconds: number; recorded_at: string }>
  status: string
  user_id: string | null
}

export interface IntakeEvent {
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

export type Period = 'today' | 'week' | 'month'

export interface TokenUsageResponse {
  totalInputTokens: number
  totalOutputTokens: number
  totalCostCents: number
  requestCount: number
  costOverTime: Array<{ date: string; costCents: number }>
  usageByOperation: Array<{
    operation: string
    inputTokens: number
    outputTokens: number
    costCents: number
    count: number
  }>
}
