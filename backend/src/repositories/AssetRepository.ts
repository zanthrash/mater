import type { SupabaseClient } from '@supabase/supabase-js'

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
  type_specific_specs: Record<string, unknown>
  lot_number: string | null
  yard_location: string | null
  consignor: string | null
  photos: Array<{ url: string; label: string; type: string }>
  status: string
}

export type CreateAssetData = Omit<Asset, 'id' | 'created_at' | 'updated_at'>

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

export type CreateIntakeEventData = Omit<IntakeEvent, 'id' | 'created_at'>

export interface ListAssetsOptions {
  category?: string
  type?: string
  make?: string
  status?: string
  search?: string
  limit?: number
  offset?: number
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class AssetRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async create(data: CreateAssetData): Promise<Asset> {
    const { data: record, error } = await this.supabase
      .from('assets')
      .insert(data)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create asset: ${error.message}`)
    }

    return record as Asset
  }

  async findById(id: string): Promise<Asset> {
    const { data: record, error } = await this.supabase
      .from('assets')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundError(`Asset not found: ${id}`)
      }
      throw new Error(`Database error: ${error.message}`)
    }

    return record as Asset
  }

  async update(id: string, data: Partial<CreateAssetData>): Promise<Asset> {
    const { data: record, error } = await this.supabase
      .from('assets')
      .update(data)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    return record as Asset
  }

  async list(options: ListAssetsOptions): Promise<{ data: Asset[]; total: number }> {
    const limit = options.limit ?? 20
    const offset = options.offset ?? 0

    let query = this.supabase.from('assets').select('*', { count: 'exact' }).neq('status', 'deleted')

    if (options.category !== undefined) {
      query = query.eq('category', options.category)
    }
    if (options.type !== undefined) {
      query = query.eq('type', options.type)
    }
    if (options.make !== undefined) {
      query = query.eq('make', options.make)
    }
    if (options.status !== undefined) {
      query = query.eq('status', options.status)
    }
    if (options.search !== undefined) {
      query = query.or(
        `make.ilike.%${options.search}%,model.ilike.%${options.search}%,vin_serial.ilike.%${options.search}%,lot_number.ilike.%${options.search}%`
      )
    }

    query = query.order('created_at', { ascending: false })
    query = query.range(offset, offset + limit - 1)

    const { data: records, error, count } = await query

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    return { data: (records ?? []) as Asset[], total: count ?? 0 }
  }

  async createIntakeEvent(data: CreateIntakeEventData): Promise<IntakeEvent> {
    const { data: record, error } = await this.supabase
      .from('intake_events')
      .insert(data)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create intake event: ${error.message}`)
    }

    return record as IntakeEvent
  }

  async findIntakeEventsByAssetId(assetId: string): Promise<IntakeEvent[]> {
    const { data: records, error } = await this.supabase
      .from('intake_events')
      .select('*')
      .eq('asset_id', assetId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    return (records ?? []) as IntakeEvent[]
  }
}
