import AsyncStorage from '@react-native-async-storage/async-storage'
import { WizardStateManager } from '../state/WizardStateManager'
import type { AssetPhoto, IntakeDraft } from '../state/WizardStateManager'

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}))

describe('WizardStateManager', () => {
  let manager: WizardStateManager

  beforeEach(() => {
    jest.clearAllMocks()
    manager = new WizardStateManager()
  })

  it('saves step data to AsyncStorage', async () => {
    ;(AsyncStorage.getItem as jest.Mock).mockResolvedValue(null)
    ;(AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined)

    await manager.saveStep('vin', { vin: '1FT8W3DT5KEE12345' })

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'intake_draft',
      expect.stringContaining('1FT8W3DT5KEE12345'),
    )
  })

  it('loadDraft returns persisted data', async () => {
    const draft: Partial<IntakeDraft> = { step: 'vin', vin: 'TEST123' }
    ;(AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(draft))

    const result = await manager.loadDraft()

    expect(result).toEqual(draft)
  })

  it('loadDraft returns null when no draft', async () => {
    ;(AsyncStorage.getItem as jest.Mock).mockResolvedValue(null)

    const result = await manager.loadDraft()

    expect(result).toBeNull()
  })

  it('clearDraft removes item from AsyncStorage', async () => {
    ;(AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined)

    await manager.clearDraft()

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('intake_draft')
  })

  it('saveStep merges with existing draft', async () => {
    const existing: Partial<IntakeDraft> = { step: 'vin', vin: 'EXISTING123', overviewUri: 'file://photo.jpg' }
    ;(AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(existing))
    ;(AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined)

    await manager.saveStep('guided-photos', { overviewUri: 'file://new.jpg' })

    const [, saved] = (AsyncStorage.setItem as jest.Mock).mock.calls[0]
    const parsed = JSON.parse(saved)
    expect(parsed.step).toBe('guided-photos')
    expect(parsed.vin).toBe('EXISTING123')
    expect(parsed.overviewUri).toBe('file://new.jpg')
  })

  it('saves classificationResult to draft', async () => {
    ;(AsyncStorage.getItem as jest.Mock).mockResolvedValue(null)
    ;(AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined)

    const classificationResult: IntakeDraft['classificationResult'] = {
      taxonomy: { category: 'vehicle', type: 'truck', subtype: 'flatbed', confidence: 0.95 },
      photoChecklist: ['front', 'rear', 'driver-side'],
    }

    await manager.saveStep('overview', { classificationResult })

    const [, saved] = (AsyncStorage.setItem as jest.Mock).mock.calls[0]
    const parsed = JSON.parse(saved)
    expect(parsed.classificationResult).toEqual(classificationResult)
  })

  it('saves photos array to draft', async () => {
    ;(AsyncStorage.getItem as jest.Mock).mockResolvedValue(null)
    ;(AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined)

    const photos: AssetPhoto[] = [
      { uri: 'file://front.jpg', label: 'front', type: 'guided' },
      { uri: 'file://rear.jpg', label: 'rear', type: 'guided', base64: 'abc123' },
      { uri: 'file://extra.jpg', label: 'extra shot', type: 'extra' },
    ]

    await manager.saveStep('guided-photos', { photos })

    const [, saved] = (AsyncStorage.setItem as jest.Mock).mock.calls[0]
    const parsed = JSON.parse(saved)
    expect(parsed.photos).toEqual(photos)
  })

  it('saves aiSpecResult to draft', async () => {
    ;(AsyncStorage.getItem as jest.Mock).mockResolvedValue(null)
    ;(AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined)

    const aiSpecResult: IntakeDraft['aiSpecResult'] = {
      coreSpecs: {
        make: 'Ford',
        model: 'F-250',
        year: 2020,
        engineType: 'diesel',
        transmission: 'automatic',
        gvwLbs: 10000,
        hoursOnMeter: 1500,
      },
      typeSpecificSpecs: { bedLength: '8ft', cabStyle: 'crew' },
      confidenceScore: 0.88,
    }

    await manager.saveStep('review', { aiSpecResult })

    const [, saved] = (AsyncStorage.setItem as jest.Mock).mock.calls[0]
    const parsed = JSON.parse(saved)
    expect(parsed.aiSpecResult).toEqual(aiSpecResult)
  })

  it('saves yardMetadata to draft', async () => {
    ;(AsyncStorage.getItem as jest.Mock).mockResolvedValue(null)
    ;(AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined)

    const yardMetadata: IntakeDraft['yardMetadata'] = {
      lotNumber: 'A-42',
      yardLocation: 'North Lot',
      consignor: 'Smith Farms',
    }

    await manager.saveStep('home', { yardMetadata })

    const [, saved] = (AsyncStorage.setItem as jest.Mock).mock.calls[0]
    const parsed = JSON.parse(saved)
    expect(parsed.yardMetadata).toEqual(yardMetadata)
  })

  it('handles all valid IntakeStep values including taxonomy-validation', async () => {
    ;(AsyncStorage.getItem as jest.Mock).mockResolvedValue(null)
    ;(AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined)

    const steps = ['home', 'overview', 'vin', 'taxonomy-validation', 'guided-photos', 'review', 'submit-success'] as const

    for (const step of steps) {
      await manager.saveStep(step, {})
      const [, saved] = (AsyncStorage.setItem as jest.Mock).mock.calls.at(-1)!
      const parsed = JSON.parse(saved)
      expect(parsed.step).toBe(step)
    }
  })

  it('saves skippedLabels to draft', async () => {
    ;(AsyncStorage.getItem as jest.Mock).mockResolvedValue(null)
    ;(AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined)

    await manager.saveStep('guided-photos', { skippedLabels: ['Serial Plate', 'Engine'] })

    const [, saved] = (AsyncStorage.setItem as jest.Mock).mock.calls[0]
    const parsed = JSON.parse(saved)
    expect(parsed.skippedLabels).toEqual(['Serial Plate', 'Engine'])
  })

  it('merges skippedLabels with existing draft', async () => {
    const existing: Partial<IntakeDraft> = {
      step: 'guided-photos',
      skippedLabels: ['Front'],
    }
    ;(AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(existing))
    ;(AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined)

    await manager.saveStep('guided-photos', { skippedLabels: ['Front', 'Rear'] })

    const [, saved] = (AsyncStorage.setItem as jest.Mock).mock.calls[0]
    const parsed = JSON.parse(saved)
    expect(parsed.skippedLabels).toEqual(['Front', 'Rear'])
  })
})
