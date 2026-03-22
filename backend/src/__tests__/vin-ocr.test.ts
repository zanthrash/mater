import { describe, it, expect, vi } from 'vitest'
import { ImageAnalysisService, VinExtractionError } from '../services/ImageAnalysisService.js'
import { buildApp } from '../app.js'

function makeAnthropicMock(responseText: string) {
  const create = vi.fn().mockResolvedValue({
    content: [{ type: 'text', text: responseText }],
  })
  return {
    messages: { create },
    _mocks: { create },
  }
}

describe('ImageAnalysisService.extractVinFromImage', () => {
  const fakeBase64 = Buffer.from('fake-image').toString('base64')

  it('returns extracted VIN on success', async () => {
    const anthropic = makeAnthropicMock('1HGCM82633A004352')
    const service = new ImageAnalysisService(anthropic as any)

    const vin = await service.extractVinFromImage(fakeBase64)

    expect(vin).toBe('1HGCM82633A004352')
    expect(anthropic._mocks.create).toHaveBeenCalledOnce()
    expect(anthropic._mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-sonnet-4-6',
        max_tokens: 256,
      }),
    )
  })

  it('trims whitespace from VIN response', async () => {
    const anthropic = makeAnthropicMock('  1HGCM82633A004352  \n')
    const service = new ImageAnalysisService(anthropic as any)

    const vin = await service.extractVinFromImage(fakeBase64)

    expect(vin).toBe('1HGCM82633A004352')
  })

  it('throws VinExtractionError when no VIN found', async () => {
    const anthropic = makeAnthropicMock('NO_VIN_FOUND')
    const service = new ImageAnalysisService(anthropic as any)

    await expect(service.extractVinFromImage(fakeBase64)).rejects.toThrow(VinExtractionError)
    await expect(service.extractVinFromImage(fakeBase64)).rejects.toThrow('No VIN found in image')
  })

  it('throws VinExtractionError when response is empty', async () => {
    const anthropic = makeAnthropicMock('')
    const service = new ImageAnalysisService(anthropic as any)

    await expect(service.extractVinFromImage(fakeBase64)).rejects.toThrow(VinExtractionError)
  })

  it('throws VinExtractionError when no text block in response', async () => {
    const create = vi.fn().mockResolvedValue({
      content: [],
    })
    const anthropic = { messages: { create } }
    const service = new ImageAnalysisService(anthropic as any)

    await expect(service.extractVinFromImage(fakeBase64)).rejects.toThrow('No text response from API')
  })

  it('rethrows unexpected errors as-is', async () => {
    const create = vi.fn().mockRejectedValue(new Error('API rate limit exceeded'))
    const anthropic = { messages: { create } }
    const service = new ImageAnalysisService(anthropic as any)

    await expect(service.extractVinFromImage(fakeBase64)).rejects.toThrow('API rate limit exceeded')
  })
})

describe('POST /api/analyze/vin-ocr route', () => {
  it('route is registered and rejects missing body', async () => {
    const app = buildApp()

    const response = await app.inject({
      method: 'POST',
      url: '/api/analyze/vin-ocr',
      payload: {},
    })

    // Should get 400 (validation error) not 404 (route not found)
    expect(response.statusCode).toBe(400)

    await app.close()
  })
})
