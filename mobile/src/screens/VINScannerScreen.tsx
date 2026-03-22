import React, { useState, useRef } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Linking,
} from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { PhotoCaptureModule } from '../modules/PhotoCaptureModule'
import { APIClient } from '../services/APIClient'

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
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cameraRef = useRef<CameraView>(null)

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
      setError(null)
    }
  }

  const handleRetake = () => {
    setCapturedUri(null)
    setError(null)
  }

  const handleUsePhoto = async () => {
    if (!capturedUri) return
    setProcessing(true)
    setError(null)
    try {
      const module = new PhotoCaptureModule()
      const result = await module.processPhoto(capturedUri, 'vin')
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
          <View style={styles.framingGuide} />
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
          <Text style={styles.flashButtonText}>
            Flash: {flash === 'off' ? 'Off' : 'On'}
          </Text>
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
    paddingHorizontal: 32,
  },
  settingsButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginBottom: 12,
  },
  settingsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
    fontSize: 14,
    fontWeight: '600',
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
    backgroundColor: '#007AFF',
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
    fontSize: 16,
    fontWeight: '600',
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    color: '#fff',
    fontSize: 16,
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
    fontSize: 14,
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
    borderColor: '#fff',
    borderRadius: 8,
  },
  framingLabelContainer: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 8,
    alignItems: 'center',
  },
  framingLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  framingDimBottom: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
})
