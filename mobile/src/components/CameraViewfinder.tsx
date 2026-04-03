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
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as ScreenOrientation from 'expo-screen-orientation'
import { PhotoCaptureModule } from '../modules/PhotoCaptureModule'

export interface CameraViewfinderProps {
  onCapture: (base64: string) => void
  onCancel: () => void
  label?: string
}

type ViewState = 'requesting-permission' | 'no-permission' | 'camera' | 'preview'

export function CameraViewfinder({ onCapture, onCancel, label }: CameraViewfinderProps) {
  const { width, height } = useWindowDimensions()
  const isLandscape = width > height
  const [permission, requestPermission] = useCameraPermissions()
  const [flash, setFlash] = useState<'off' | 'on'>('off')
  const [capturedUri, setCapturedUri] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const cameraRef = useRef<CameraView>(null)

  useEffect(() => {
    ScreenOrientation.unlockAsync()
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP)
    }
  }, [])

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
    }
  }

  const handleRetake = () => {
    setCapturedUri(null)
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
          <View style={styles.labelPill}>
            <Text style={styles.labelText}>{label}</Text>
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
      {label && (
        <View style={styles.labelPill}>
          <Text style={styles.labelText}>{label}</Text>
        </View>
      )}
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
    backgroundColor: '#007AFF',
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
  labelPill: {
    position: 'absolute',
    top: 110,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 6,
    paddingHorizontal: 18,
    borderRadius: 20,
    zIndex: 10,
  },
  labelText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})
