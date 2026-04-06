import React, { useState, useRef, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Linking,
  useWindowDimensions,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { PhotoCaptureModule } from '../modules/PhotoCaptureModule'
import { typography } from '../theme'

// Safety orange — used on dark camera backgrounds
const ORANGE = '#EA580C'

export interface CameraViewfinderProps {
  onCapture: (base64: string) => void
  onCancel: () => void
  label?: string
  onViewStateChange?: (state: 'camera' | 'preview') => void
}

type ViewState = 'requesting-permission' | 'no-permission' | 'camera' | 'preview'

export function CameraViewfinder({ onCapture, onCancel, label, onViewStateChange }: CameraViewfinderProps) {
  const { width, height } = useWindowDimensions()
  const isLandscape = width > height
  const [permission, requestPermission] = useCameraPermissions()
  const [flash, setFlash] = useState<'off' | 'on'>('off')
  const [capturedUri, setCapturedUri] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
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
      onViewStateChange?.('preview')
    }
  }

  const handleRetake = () => {
    setCapturedUri(null)
    onViewStateChange?.('camera')
  }

  const handleUsePhoto = async () => {
    if (!capturedUri) return
    setProcessing(true)
    try {
      const module = new PhotoCaptureModule()
      const result = await module.processPhoto(capturedUri, 'detail')
      onCapture(result.base64)
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
          Camera access is needed to photograph equipment
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
        {label && (
          <View style={styles.labelBar}>
            <Text style={styles.labelBarText}>{label}</Text>
          </View>
        )}
        {processing ? (
          <View style={styles.processingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.processingText}>Processing...</Text>
          </View>
        ) : (
          <View style={styles.previewControls}>
            <TouchableOpacity style={styles.retakeButton} onPress={handleRetake}>
              <Text style={styles.controlButtonText}>Retake</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.usePhotoButton} onPress={handleUsePhoto}>
              <Text style={styles.controlButtonText}>Use Photo</Text>
            </TouchableOpacity>
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
      {label && (
        <View style={styles.labelBar}>
          <Text style={styles.labelBarText}>{label}</Text>
        </View>
      )}
      <View style={isLandscape ? styles.bottomControlsLandscape : styles.bottomControls}>
        <TouchableOpacity style={styles.captureButton} onPress={handleCapture} testID="capture-button">
          <View style={styles.captureButtonInner} />
        </TouchableOpacity>
      </View>
    </View>
  )
}

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
  bottomControlsLandscape: {
    position: 'absolute',
    right: 30,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
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
  previewControls: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 40,
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
  labelBar: {
    position: 'absolute',
    top: 96,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingVertical: 8,
    paddingHorizontal: 20,
    zIndex: 10,
  },
  labelBarText: {
    color: 'rgba(255,255,255,0.9)',
    ...typography.bodySmall,
    textAlign: 'center',
  },
})
