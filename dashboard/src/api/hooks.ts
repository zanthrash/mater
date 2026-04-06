import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import type { DashboardStats, IntakeVolumeBucket, CategoryCount, OperatorStats, AiInsights, ActivityEvent, Asset, IntakeEvent, Period } from './types'

export function useDashboardStats(period: Period) {
  return useQuery({
    queryKey: ['dashboard', 'stats', period],
    queryFn: async () => {
      const { data } = await api.get<DashboardStats>('/api/dashboard/stats', { params: { period } })
      return data
    },
  })
}

export function useIntakeVolume(period: Period) {
  return useQuery({
    queryKey: ['dashboard', 'intake-volume', period],
    queryFn: async () => {
      const { data } = await api.get<{ buckets: IntakeVolumeBucket[] }>('/api/dashboard/intake-volume', { params: { period } })
      return data.buckets
    },
  })
}

export function useCategoryBreakdown(period: Period) {
  return useQuery({
    queryKey: ['dashboard', 'category-breakdown', period],
    queryFn: async () => {
      const { data } = await api.get<{ categories: CategoryCount[] }>('/api/dashboard/category-breakdown', { params: { period } })
      return data.categories
    },
  })
}

export function useOperatorStats(period: Period) {
  return useQuery({
    queryKey: ['dashboard', 'operators', period],
    queryFn: async () => {
      const { data } = await api.get<{ operators: OperatorStats[] }>('/api/dashboard/operators', { params: { period } })
      return data.operators
    },
  })
}

export function useAiInsights(period: Period) {
  return useQuery({
    queryKey: ['dashboard', 'ai-insights', period],
    queryFn: async () => {
      const { data } = await api.get<AiInsights>('/api/dashboard/ai-insights', { params: { period } })
      return data
    },
  })
}

export function useActivityStream(limit: number = 20) {
  return useQuery({
    queryKey: ['dashboard', 'activity', limit],
    queryFn: async () => {
      const { data } = await api.get<{ events: ActivityEvent[] }>('/api/dashboard/activity', { params: { limit } })
      return data.events
    },
    refetchInterval: 15_000,
  })
}

export function useAssets(params: {
  status?: string
  category?: string
  type?: string
  make?: string
  search?: string
  userId?: string
  limit?: number
  offset?: number
}) {
  return useQuery({
    queryKey: ['assets', params],
    queryFn: async () => {
      const { data } = await api.get<{ data: Asset[]; total: number }>('/api/assets', { params })
      return data
    },
  })
}

export function useAsset(id: string) {
  return useQuery({
    queryKey: ['assets', id],
    queryFn: async () => {
      const { data } = await api.get<Asset>(`/api/assets/${id}`)
      return data
    },
  })
}

export function useIntakeEvents(assetId: string) {
  return useQuery({
    queryKey: ['assets', assetId, 'intake-events'],
    queryFn: async () => {
      const { data } = await api.get<{ events: IntakeEvent[] }>(`/api/assets/${assetId}/intake-events`)
      return data.events
    },
  })
}

export function useUpdateAsset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Asset> }) => {
      const { data } = await api.put<Asset>(`/api/assets/${id}`, updates)
      return data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['assets', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['assets'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
