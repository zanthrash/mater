import { PhotoCaptureModule } from '../modules/PhotoCaptureModule'

// Mock expo-image-manipulator
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: 'jpeg' },
}))

import * as ImageManipulator from 'expo-image-manipulator'

describe('PhotoCaptureModule', () => {
  const module = new PhotoCaptureModule()

  it('returns processed photo with correct type', async () => {
    ;(ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue({
      uri: 'file://resized.jpg',
      base64: 'abc123',
    })

    const result = await module.processPhoto('file://original.jpg', 'detail')

    expect(result.uri).toBe('file://resized.jpg')
    expect(result.base64).toBe('abc123')
    expect(result.type).toBe('detail')
  })

  it('applies resize to 1024px width', async () => {
    ;(ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue({
      uri: 'file://resized.jpg',
      base64: 'xyz',
    })

    await module.processPhoto('file://photo.jpg', 'overview')

    expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
      'file://photo.jpg',
      [{ resize: { width: 1024 } }],
      expect.objectContaining({ compress: 0.8 })
    )
  })
})
