import axios, { AxiosInstance } from 'axios'

export interface ServiceError {
  message: string
  source: 'claude' | 'nhtsa' | 'backend'
}

export interface AnalyzeVinRequest {
  vin: string
}

export interface VinResult {
  make: string | null
  model: string | null
  year: number | null
  engineType: string | null
  transmission: string | null
  gvwLbs: number | null
  source: 'nhtsa' | 'claude'
}

export interface ClassificationResult {
  taxonomy: {
    category: string
    type: string
    subtype: string | null
    confidence: number
  }
  photoChecklist: string[]
}

export interface CoreSpecs {
  make: string | null
  model: string | null
  year: number | null
  engineType: string | null
  transmission: string | null
  gvwLbs: number | null
  hoursOnMeter: number | null
}

export interface AnalysisResult {
  coreSpecs: CoreSpecs
  typeSpecificSpecs: Record<string, string | number | null>
  confidenceScore: number
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
  status: string
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

export interface CreateAssetRequest {
  vinSerial?: string
  operatorName?: string
  gpsLat?: number
  gpsLon?: number
  photos: Array<{ base64: string; label: string; type: 'guided' | 'extra'; mediaType?: string }>
  taxonomy?: { category: string; type: string; subtype?: string | null }
  coreSpecs?: Record<string, unknown>
  typeSpecificSpecs?: Record<string, string | number | null>
  yardMetadata?: { lotNumber?: string; yardLocation?: string; consignor?: string }
  aiAnalysisResult?: Record<string, unknown> | null
  vinLookupResult?: Record<string, unknown> | null
  aiTaxonomyResult?: Record<string, unknown> | null
}

export interface AssetListResponse {
  data: Asset[]
  total: number
}

export interface TaxonomyTypeNode {
  type: string
  subtypes: string[]
}

export interface TaxonomyCategoryNode {
  category: string
  types: TaxonomyTypeNode[]
}

export class APIClient {
  private readonly http: AxiosInstance

  constructor(baseURL: string = 'http://192.168.1.15:3000') {
    this.http = axios.create({ baseURL })
  }

  async analyzeVin(request: AnalyzeVinRequest): Promise<VinResult> {
    try {
      const response = await this.http.post<VinResult>('/api/analyze/vin', request)
      return response.data
    } catch (error) {
      const err = error as import('axios').AxiosError
      const message = (err.response?.data as { error?: string })?.error ?? err.message
      throw { message, source: 'backend' as const } as ServiceError
    }
  }

  async analyzeImages(request: { photos: Array<{ base64: string; type: string; mediaType?: string }>; taxonomy?: { category: string; type: string; subtype?: string | null } | null }): Promise<AnalysisResult> {
    try {
      const response = await this.http.post<AnalysisResult>('/api/analyze/images', request)
      return response.data
    } catch (error) {
      const err = error as import('axios').AxiosError
      const message = (err.response?.data as { error?: string })?.error ?? err.message
      throw { message, source: 'backend' as const } as ServiceError
    }
  }

  async analyzeVinOcr(image: string): Promise<{ vin: string }> {
    try {
      const response = await this.http.post<{ vin: string }>('/api/analyze/vin-ocr', { image })
      return response.data
    } catch (error) {
      const err = error as import('axios').AxiosError
      const message = (err.response?.data as { error?: string })?.error ?? err.message
      throw { message, source: 'backend' as const } as ServiceError
    }
  }

  async classifyEquipment(photos: Array<{ base64: string; mediaType?: string }>, vinSerial?: string | null): Promise<ClassificationResult> {
    try {
      const response = await this.http.post<ClassificationResult>('/api/analyze/classify', { photos, vinSerial })
      return response.data
    } catch (error) {
      const err = error as import('axios').AxiosError
      const message = (err.response?.data as { error?: string })?.error ?? err.message
      throw { message, source: 'backend' as const } as ServiceError
    }
  }

  async createAsset(request: CreateAssetRequest): Promise<{ asset: Asset }> {
    try {
      const response = await this.http.post<{ asset: Asset }>('/api/assets', request)
      return response.data
    } catch (error) {
      const err = error as import('axios').AxiosError
      const message = (err.response?.data as { error?: string })?.error ?? err.message
      throw { message, source: 'backend' as const } as ServiceError
    }
  }

  async getAsset(id: string): Promise<Asset> {
    try {
      const response = await this.http.get<Asset>(`/api/assets/${id}`)
      return response.data
    } catch (error) {
      const err = error as import('axios').AxiosError
      const message = (err.response?.data as { error?: string })?.error ?? err.message
      throw { message, source: 'backend' as const } as ServiceError
    }
  }

  async listAssets(params?: { category?: string; type?: string; make?: string; status?: string; search?: string; limit?: number; offset?: number }): Promise<AssetListResponse> {
    try {
      const response = await this.http.get<AssetListResponse>('/api/assets', { params })
      return response.data
    } catch (error) {
      const err = error as import('axios').AxiosError
      const message = (err.response?.data as { error?: string })?.error ?? err.message
      throw { message, source: 'backend' as const } as ServiceError
    }
  }

  async getTaxonomy(): Promise<TaxonomyCategoryNode[]> {
    try {
      const response = await this.http.get<TaxonomyCategoryNode[]>('/api/taxonomy')
      return response.data
    } catch (error) {
      const err = error as import('axios').AxiosError
      const message = (err.response?.data as { error?: string })?.error ?? err.message
      throw { message, source: 'backend' as const } as ServiceError
    }
  }
}
