import AsyncStorage from '@react-native-async-storage/async-storage'

const DRAFT_KEY = 'inspection_draft'

export type WizardStep = 'overview' | 'vin' | 'photos' | 'conflict' | 'condition' | 'review' | 'confirm'

export interface WizardDraft {
  step: WizardStep
  overviewUri?: string
  vin?: string
  vinResult?: {
    make: string | null
    model: string | null
    year: number | null
    engineType: string | null
    transmission: string | null
    gvwLbs: number | null
    source: 'nhtsa' | 'claude'
  } | null
  aiResult?: {
    make: string | null
    model: string | null
    year: number | null
    engineType: string | null
    transmission: string | null
    gvwLbs: number | null
    hoursOnMeter: number | null
    conditionSummary: string | null
    confidenceScore: number | null
  } | null
  resolvedData?: Record<string, string | number | null>
}

export class WizardStateManager {
  async saveStep(step: WizardStep, data: Partial<WizardDraft>): Promise<void> {
    const existing = await this.loadDraft()
    const merged: WizardDraft = {
      ...(existing ?? {}),
      ...data,
      step,
    }
    await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(merged))
  }

  async loadDraft(): Promise<WizardDraft | null> {
    const value = await AsyncStorage.getItem(DRAFT_KEY)
    if (value === null) return null
    return JSON.parse(value) as WizardDraft
  }

  async clearDraft(): Promise<void> {
    await AsyncStorage.removeItem(DRAFT_KEY)
  }
}
