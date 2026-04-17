import { vi, describe, it, expect, beforeEach } from 'vitest'
import axios from 'axios'

vi.mock('axios')
const mockedAxios = axios as unknown as { get: ReturnType<typeof vi.fn> }

import { VINLookupService } from '../services/VINLookupService.js'

function makeNhtsaResponse(overrides: Record<string, string>) {
  const defaults: Record<string, string> = {
    Make: '',
    Model: '',
    'Model Year': '',
    'Fuel Type - Primary': '',
    'Transmission Style': '',
    'Gross Vehicle Weight Rating From': '',
  }
  const merged = { ...defaults, ...overrides }
  return {
    data: {
      Results: Object.entries(merged).map(([Variable, Value]) => ({ Variable, Value })),
    },
  }
}

function makeAnthropicMock(jsonPayload: object) {
  const responseText = JSON.stringify(jsonPayload)
  const create = vi.fn().mockResolvedValue({
    content: [{ type: 'text', text: responseText }],
    usage: { input_tokens: 100, output_tokens: 50 },
  })
  return {
    messages: { create },
    _mocks: { create },
  }
}

describe('VINLookupService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns NHTSA result when Make is found', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue(
      makeNhtsaResponse({
        Make: 'Caterpillar',
        Model: '320',
        'Model Year': '2018',
        'Fuel Type - Primary': 'Diesel',
        'Transmission Style': 'Automatic',
        'Gross Vehicle Weight Rating From': 'Class 3: 10,001 - 14,000 lb',
      }),
    )

    const anthropic = makeAnthropicMock({})
    const service = new VINLookupService(anthropic as any)
    const { result } = await service.lookupVin('1FTZX1722XKA76091')

    expect(result.source).toBe('nhtsa')
    expect(result.make).toBe('Caterpillar')
    expect(result.model).toBe('320')
    expect(result.year).toBe(2018)
    expect(anthropic._mocks.create).not.toHaveBeenCalled()
  })

  it('falls back to Claude when NHTSA returns empty Make', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue(
      makeNhtsaResponse({ Make: '', Model: '', 'Model Year': '' }),
    )

    const claudePayload = { make: 'John Deere', model: '310L', year: 2020, engineType: null, transmission: null, gvwLbs: null }
    const anthropic = makeAnthropicMock(claudePayload)
    const service = new VINLookupService(anthropic as any)
    const { result } = await service.lookupVin('1T9AA5324YB058839')

    expect(result.source).toBe('claude')
    expect(result.make).toBe('John Deere')
    expect(result.model).toBe('310L')
    expect(result.year).toBe(2020)
    expect(anthropic._mocks.create).toHaveBeenCalledOnce()
  })

  it('falls back to Claude when NHTSA throws', async () => {
    mockedAxios.get = vi.fn().mockRejectedValue(new Error('Network error'))

    const claudePayload = { make: 'Komatsu', model: 'PC200', year: 2015, engineType: 'Diesel', transmission: null, gvwLbs: null }
    const anthropic = makeAnthropicMock(claudePayload)
    const service = new VINLookupService(anthropic as any)
    const { result } = await service.lookupVin('SOME_SERIAL_123')

    expect(result.source).toBe('claude')
    expect(result.make).toBe('Komatsu')
    expect(anthropic._mocks.create).toHaveBeenCalledOnce()
  })
})
