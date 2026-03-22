import axios, { AxiosInstance } from 'axios'

export interface ServiceError {
  message: string
  source: 'claude' | 'nhtsa' | 'backend'
}

export interface AnalyzeImagesRequest {
  inspectionId: string
  photos: Array<{ base64: string; type: string; mediaType?: string }>
}

export interface AnalyzeImagesResponse {
  storedPhotos: Array<{ url: string; type: string }>
  analysis: {
    make: string | null
    model: string | null
    year: number | null
    engineType: string | null
    transmission: string | null
    gvwLbs: number | null
    hoursOnMeter: number | null
    conditionSummary: string | null
    confidenceScore: number | null
  }
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

export interface ConditionRating {
  rating: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Salvage'
  notes: string
}

export interface SubmitInspectionRequest {
  inspectorName: string
  gpsLat?: number
  gpsLon?: number
  photos: Array<{ base64: string; type: string }>
  equipmentData: Record<string, unknown>
  conditionData: {
    overall: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Salvage'
    engine: ConditionRating
    hydraulics: ConditionRating
    undercarriage: ConditionRating
    cab: ConditionRating
  }
  aiImageResult?: Record<string, unknown> | null
  vinLookupResult?: Record<string, unknown> | null
}

export interface SubmitInspectionResponse {
  inspectionId: string
  pdfUrl: string
}

export class APIClient {
  private readonly http: AxiosInstance

  constructor(baseURL: string = 'http://localhost:3000') {
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

  async analyzeImages(request: AnalyzeImagesRequest): Promise<AnalyzeImagesResponse> {
    try {
      const response = await this.http.post<AnalyzeImagesResponse>('/api/analyze/images', request)
      return response.data
    } catch (error) {
      const err = error as import('axios').AxiosError
      const message = (err.response?.data as { error?: string })?.error ?? err.message
      throw { message, source: 'backend' as const } as ServiceError
    }
  }

  async submitInspection(request: SubmitInspectionRequest): Promise<SubmitInspectionResponse> {
    try {
      const response = await this.http.post<SubmitInspectionResponse>('/api/inspections', request)
      return response.data
    } catch (error) {
      const err = error as import('axios').AxiosError
      const message = (err.response?.data as { error?: string })?.error ?? err.message
      throw { message, source: 'backend' as const } as ServiceError
    }
  }
}
