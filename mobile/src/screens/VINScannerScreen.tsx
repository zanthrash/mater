import React, { useState, useRef } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Linking,
  Dimensions,
  LayoutChangeEvent,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { PhotoCaptureModule, CropRegion } from '../modules/PhotoCaptureModule'
import { APIClient } from '../services/APIClient'
import { typography } from '../theme'

const ORANGE = '#EA580C'

export interface VINScannerScreenProps {
  onVinScanned: (vin: string) => void
  onCancel: () => void
  client?: APIClient
}

type ViewState = 'requesting-permission' | 'no-permission' | 'camera' | 'preview'

export function VINScannerScreen({
  onVinScanned,
  onCancel,
  client = new APIClient(),
}: VINScannerScreenProps) {
  const [permission, requestPermission] = useCameraPermissions()
  const [flash, setFlash] = useState<'off' | 'on'>('off')
  const [capturedUri, setCapturedUri] = useState<string | null>(null)
  const [photoDims, setPhotoDims] = useState<{ width: number; height: number } | null>(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cameraRef = useRef<CameraView>(null)
  const guideLayoutRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null)

  const handleGuideLayout = (e: LayoutChangeEvent) => {
    e.target.measureInWindow((x, y, width, height) => {
      guideLayoutRef.current = { x, y, width, height }
    })
  }

  const getViewState = (): ViewState => {
    if (!permission) return 'requesting-permission'
    if (!permission.granted) return 'no-permission'
    if (capturedUri) return 'preview'
    return 'camera'
  }

  const viewState = getViewState()

  const handleRequestPermission = async () => {
    await requestPermission()
  }

  const handleCapture = async () => {
    if (!cameraRef.current) return
    const photo = await cameraRef.current.takePictureAsync()
    if (photo) {
      setCapturedUri(photo.uri)
      setPhotoDims({ width: photo.width, height: photo.height })
      setError(null)
    }
  }

  const handleRetake = () => {
    setCapturedUri(null)
    setPhotoDims(null)
    setError(null)
  }

  const computeCropRegion = (): CropRegion | undefined => {
    const guide = guideLayoutRef.current
    if (!guide || !photoDims) return undefined

    const { width: screenW, height: screenH } = Dimensions.get('window')
    const { width: photoW, height: photoH } = photoDims

    const previewAspect = screenW / screenH
    const photoAspect = photoW / photoH

    let scale: number
    let offsetX = 0
    let offsetY = 0

    if (photoAspect > previewAspect) {
      // Photo is wider than preview — height fills screen, width is cropped
      scale = photoH / screenH
      offsetX = (photoW - screenW * scale) / 2
    } else {
      // Photo is taller than preview — width fills screen, height is cropped
      scale = photoW / screenW
      offsetY = (photoH - screenH * scale) / 2
    }

    return {
      originX: Math.max(0, Math.round(offsetX + guide.x * scale)),
      originY: Math.max(0, Math.round(offsetY + guide.y * scale)),
      width: Math.round(guide.width * scale),
      height: Math.round(guide.height * scale),
    }
  }

  const handleUsePhoto = async () => {
    if (!capturedUri) return
    setProcessing(true)
    setError(null)
    try {
      const module = new PhotoCaptureModule()
      const crop = computeCropRegion()
      const result = await module.processPhoto(capturedUri, 'vin', crop)
      const ocrResult = await client.analyzeVinOcr(result.base64)
      onVinScanned(ocrResult.vin)
    } catch (err) {
      const e = err as { message?: string }
      setError(e.message ?? 'Could not read VIN from image')
    } finally {
      setProcessing(false)
    }
  }

  const handleOpenSettings = () => {
    Linking.openSettings()
  }

  if (viewState === 'requesting-permission') {
    return (
      <View style={styles.container} testID="requesting-permission">
        <ActivityIndicator size="large" />
        <Text style={styles.permissionText}>Requesting camera permission...</Text>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (viewState === 'no-permission') {
    return (
      <View style={styles.container} testID="no-permission">
        <Text style={styles.title}>Camera Access Required</Text>
        <Text style={styles.permissionText}>
          Camera access is needed to scan VIN plates
        </Text>
        {permission && !permission.granted && permission.canAskAgain && (
          <TouchableOpacity style={styles.settingsButton} onPress={handleRequestPermission}>
            <Text style={styles.settingsButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.settingsButton} onPress={handleOpenSettings}>
          <Text style={styles.settingsButtonText}>Open Settings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (viewState === 'preview' && capturedUri) {
    return (
      <View style={styles.fullScreen} testID="preview">
        <Image source={{ uri: capturedUri }} style={styles.previewImage} />
        {processing ? (
          <View style={styles.processingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.processingText}>Reading VIN...</Text>
          </View>
        ) : (
          <View style={styles.previewControlsContainer}>
            {error !== null && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
            <View style={styles.previewControls}>
              <TouchableOpacity style={styles.retakeButton} onPress={handleRetake}>
                <Text style={styles.controlButtonText}>Retake</Text>
              </TouchableOpacity>
              {error !== null ? (
                <TouchableOpacity style={styles.cancelActionButton} onPress={onCancel}>
                  <Text style={styles.controlButtonText}>Enter Manually</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.usePhotoButton} onPress={handleUsePhoto}>
                  <Text style={styles.controlButtonText}>Use Photo</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>
    )
  }

  return (
    <View style={styles.fullScreen} testID="camera">
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
        flash={flash}
      />
      {/* Framing guide overlay */}
      <View style={styles.framingOverlay} pointerEvents="none">
        <View style={styles.framingDimTop} />
        <View style={styles.framingMiddleRow}>
          <View style={styles.framingDimSide} />
          <View style={styles.framingGuide} onLayout={handleGuideLayout} />
          <View style={styles.framingDimSide} />
        </View>
        <View style={styles.framingLabelContainer}>
          <Text style={styles.framingLabel}>Position VIN plate within frame</Text>
        </View>
        <View style={styles.framingDimBottom} />
      </View>
      <View style={styles.topControls}>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.flashButton}
          onPress={() => setFlash(flash === 'off' ? 'on' : 'off')}
        >
          <Ionicons
            name={flash === 'off' ? 'flash-off' : 'flash'}
            size={18}
            color={flash === 'on' ? ORANGE : '#fff'}
          />
        </TouchableOpacity>
      </View>
      <View style={styles.bottomControls}>
        <TouchableOpacity style={styles.captureButton} onPress={handleCapture} testID="capture-button">
          <View style={styles.captureButtonInner} />
        </TouchableOpacity>
      </View>
    </View>
  )
}

const FRAME_WIDTH_RATIO = 0.85
const FRAME_HEIGHT = 120

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#000',
  },
  fullScreen: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  title: {
    ...typography.title,
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    ...typography.body,
    color: '#ccc',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
    paddingHorizontal: 32,
  },
  settingsButton: {
    backgroundColor: ORANGE,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginBottom: 12,
  },
  settingsButtonText: {
    color: '#fff',
    ...typography.button,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  cancelButtonText: {
    color: '#fff',
    ...typography.button,
  },
  topControls: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  flashButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  flashButtonText: {
    color: '#fff',
    ...typography.bodySmall,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
  previewImage: {
    flex: 1,
    resizeMode: 'contain',
  },
  previewControlsContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  previewControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 40,
    width: '100%',
  },
  retakeButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  usePhotoButton: {
    backgroundColor: ORANGE,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  cancelActionButton: {
    backgroundColor: '#FF9500',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  controlButtonText: {
    color: '#fff',
    ...typography.button,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    color: '#fff',
    ...typography.body,
    marginTop: 12,
  },
  errorBanner: {
    backgroundColor: 'rgba(255,59,48,0.9)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    marginHorizontal: 40,
  },
  errorText: {
    color: '#fff',
    ...typography.bodySmall,
    textAlign: 'center',
  },
  // Framing guide overlay styles
  framingOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  framingDimTop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  framingMiddleRow: {
    flexDirection: 'row',
    height: FRAME_HEIGHT,
  },
  framingDimSide: {
    flex: (1 - FRAME_WIDTH_RATIO) / 2,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  framingGuide: {
    flex: FRAME_WIDTH_RATIO,
    borderWidth: 2,
    borderColor: ORANGE,
    borderRadius: 8,
  },
  framingLabelContainer: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 8,
    alignItems: 'center',
  },
  framingLabel: {
    color: '#fff',
    ...typography.label,
  },
  framingDimBottom: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
})
