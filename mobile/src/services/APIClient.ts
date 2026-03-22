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

export class APIClient {
  private readonly http: AxiosInstance

  constructor(baseURL: string = 'http://localhost:3000') {
    this.http = axios.create({ baseURL })
  }

  async analyzeImages(request: AnalyzeImagesRequest): Promise<AnalyzeImagesResponse> {
    try {
      const response = await this.http.post<AnalyzeImagesResponse>('/api/analyze/images', request)
      return response.data
    } catch (error) {
      const err = error as import('axios').AxiosError
      throw { message: err.response?.data?.error ?? err.message, source: 'backend' as const }
    }
  }
}
