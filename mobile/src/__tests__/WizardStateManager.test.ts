import AsyncStorage from '@react-native-async-storage/async-storage'
import { WizardStateManager } from '../state/WizardStateManager'

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
      'inspection_draft',
      expect.stringContaining('1FT8W3DT5KEE12345'),
    )
  })

  it('loadDraft returns persisted data', async () => {
    const draft = { step: 'vin', vin: 'TEST123' }
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

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('inspection_draft')
  })

  it('saveStep merges with existing draft', async () => {
    const existing = { step: 'vin', vin: 'EXISTING123', overviewUri: 'file://photo.jpg' }
    ;(AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(existing))
    ;(AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined)

    await manager.saveStep('photos', { overviewUri: 'file://new.jpg' })

    const [, saved] = (AsyncStorage.setItem as jest.Mock).mock.calls[0]
    const parsed = JSON.parse(saved)
    expect(parsed.step).toBe('photos')
    expect(parsed.vin).toBe('EXISTING123')
    expect(parsed.overviewUri).toBe('file://new.jpg')
  })
})
