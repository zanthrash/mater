import AsyncStorage from '@react-native-async-storage/async-storage'

const DRAFT_KEY = 'intake_draft'

export type IntakeStep = 'home' | 'overview' | 'vin' | 'guided-photos' | 'review' | 'submit-success'

export interface AssetPhoto {
  uri: string
  base64?: string
  label: string
  type: 'guided' | 'extra'
}

export interface IntakeDraft {
  step: IntakeStep
  overviewUri?: string
  overviewBase64?: string
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
  classificationResult?: {
    taxonomy: { category: string; type: string; subtype: string | null; confidence: number }
    photoChecklist: string[]
  } | null
  photos?: AssetPhoto[]
  aiSpecResult?: {
    coreSpecs: {
      make: string | null
      model: string | null
      year: number | null
      engineType: string | null
      transmission: string | null
      gvwLbs: number | null
      hoursOnMeter: number | null
    }
    typeSpecificSpecs: Record<string, string | number | null>
    confidenceScore: number
  } | null
  yardMetadata?: {
    lotNumber?: string
    yardLocation?: string
    consignor?: string
  }
}

export class WizardStateManager {
  async saveStep(step: IntakeStep, data: Partial<IntakeDraft>): Promise<void> {
    const existing = await this.loadDraft()
    const merged: IntakeDraft = {
      ...(existing ?? {}),
      ...data,
      step,
    }
    await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(merged))
  }

  async loadDraft(): Promise<IntakeDraft | null> {
    const value = await AsyncStorage.getItem(DRAFT_KEY)
    if (value === null) return null
    return JSON.parse(value) as IntakeDraft
  }

  async clearDraft(): Promise<void> {
    await AsyncStorage.removeItem(DRAFT_KEY)
  }
}
