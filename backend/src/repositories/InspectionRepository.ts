import type { SupabaseClient } from '@supabase/supabase-js'

export interface Inspection {
  id: string
  created_at: string
  inspector_name: string | null
  gps_lat: number | null
  gps_lon: number | null
  equipment_data: Record<string, unknown> | null
  condition_data: Record<string, unknown> | null
  ai_image_result: Record<string, unknown> | null
  vin_lookup_result: Record<string, unknown> | null
  pdf_url: string | null
  photos: Array<{ url: string; type: string }> | null
}

export type CreateInspectionData = Omit<Inspection, 'id' | 'created_at'>

export class InspectionRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async create(data: CreateInspectionData): Promise<Inspection> {
    const { data: record, error } = await this.supabase
      .from('inspections')
      .insert(data)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create inspection: ${error.message}`)
    }

    return record as Inspection
  }

  async findById(id: string): Promise<Inspection> {
    const { data: record, error } = await this.supabase
      .from('inspections')
      .select()
      .eq('id', id)
      .single()

    if (error || !record) {
      throw new Error(`Inspection not found: ${id}`)
    }

    return record as Inspection
  }
}
