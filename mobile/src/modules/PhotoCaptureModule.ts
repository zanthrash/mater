import * as ImageManipulator from 'expo-image-manipulator'

export type PhotoType = 'overview' | 'detail' | 'vin'

export interface CapturedPhoto {
  uri: string
  base64: string
  type: PhotoType
}

export interface CropRegion {
  originX: number
  originY: number
  width: number
  height: number
}

export class PhotoCaptureModule {
  async processPhoto(uri: string, type: PhotoType, crop?: CropRegion): Promise<CapturedPhoto> {
    const actions: ImageManipulator.Action[] = []
    if (crop) {
      actions.push({ crop })
    }
    actions.push({ resize: { width: 1024 } })

    const result = await ImageManipulator.manipulateAsync(
      uri,
      actions,
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
