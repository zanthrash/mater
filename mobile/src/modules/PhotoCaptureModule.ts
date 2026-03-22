import * as ImageManipulator from 'expo-image-manipulator'

export type PhotoType = 'overview' | 'detail' | 'vin'

export interface CapturedPhoto {
  uri: string
  base64: string
  type: PhotoType
}

export class PhotoCaptureModule {
  async processPhoto(uri: string, type: PhotoType): Promise<CapturedPhoto> {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1024 } }],
      {
        compress: 0.8,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      }
    )
    return {
      uri: result.uri,
      base64: result.base64 ?? '',
      type,
    }
  }
}
