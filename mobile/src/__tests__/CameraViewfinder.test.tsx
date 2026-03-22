import React from 'react'
import { render, fireEvent, waitFor, act } from '@testing-library/react-native'
import { Linking } from 'react-native'
import { CameraViewfinder } from '../components/CameraViewfinder'

// Mock expo-camera
const mockUseCameraPermissions = jest.fn()
const mockTakePictureAsync = jest.fn()

jest.mock('expo-camera', () => {
  const React = require('react')
  const { View } = require('react-native')
  return {
    CameraView: React.forwardRef((_props: Record<string, unknown>, ref: React.Ref<unknown>) => {
      React.useImperativeHandle(ref, () => ({
        takePictureAsync: mockTakePictureAsync,
      }))
      return <View testID="camera-view" />
    }),
    useCameraPermissions: () => mockUseCameraPermissions(),
  }
})

// Mock PhotoCaptureModule
const mockProcessPhoto = jest.fn()
jest.mock('../modules/PhotoCaptureModule', () => ({
  PhotoCaptureModule: jest.fn().mockImplementation(() => ({
    processPhoto: mockProcessPhoto,
  })),
}))

// Mock Linking.openSettings
jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined as never)

describe('CameraViewfinder', () => {
  const onCapture = jest.fn()
  const onCancel = jest.fn()
  const requestPermission = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined as never)
  })

  it('shows loading state when permission is not yet determined', () => {
    mockUseCameraPermissions.mockReturnValue([undefined, requestPermission])
    const { getByTestId, getByText } = render(
      <CameraViewfinder onCapture={onCapture} onCancel={onCancel} />
    )
    expect(getByTestId('requesting-permission')).toBeTruthy()
    expect(getByText('Requesting camera permission...')).toBeTruthy()
  })

  it('shows no-permission screen when permission is denied', () => {
    mockUseCameraPermissions.mockReturnValue([
      { granted: false, canAskAgain: false },
      requestPermission,
    ])
    const { getByTestId, getByText } = render(
      <CameraViewfinder onCapture={onCapture} onCancel={onCancel} />
    )
    expect(getByTestId('no-permission')).toBeTruthy()
    expect(getByText('Camera access is needed to photograph equipment')).toBeTruthy()
    expect(getByText('Open Settings')).toBeTruthy()
  })

  it('calls Linking.openSettings when Open Settings is pressed', () => {
    mockUseCameraPermissions.mockReturnValue([
      { granted: false, canAskAgain: false },
      requestPermission,
    ])
    const { getByText } = render(
      <CameraViewfinder onCapture={onCapture} onCancel={onCancel} />
    )
    fireEvent.press(getByText('Open Settings'))
    expect(Linking.openSettings).toHaveBeenCalled()
  })

  it('calls onCancel when Cancel is pressed on no-permission screen', () => {
    mockUseCameraPermissions.mockReturnValue([
      { granted: false, canAskAgain: false },
      requestPermission,
    ])
    const { getByText } = render(
      <CameraViewfinder onCapture={onCapture} onCancel={onCancel} />
    )
    fireEvent.press(getByText('Cancel'))
    expect(onCancel).toHaveBeenCalled()
  })

  it('renders camera view when permission is granted', () => {
    mockUseCameraPermissions.mockReturnValue([
      { granted: true },
      requestPermission,
    ])
    const { getByTestId, getByText } = render(
      <CameraViewfinder onCapture={onCapture} onCancel={onCancel} />
    )
    expect(getByTestId('camera')).toBeTruthy()
    expect(getByText('Flash: Off')).toBeTruthy()
  })

  it('toggles flash on/off', () => {
    mockUseCameraPermissions.mockReturnValue([
      { granted: true },
      requestPermission,
    ])
    const { getByText } = render(
      <CameraViewfinder onCapture={onCapture} onCancel={onCancel} />
    )
    expect(getByText('Flash: Off')).toBeTruthy()
    fireEvent.press(getByText('Flash: Off'))
    expect(getByText('Flash: On')).toBeTruthy()
    fireEvent.press(getByText('Flash: On'))
    expect(getByText('Flash: Off')).toBeTruthy()
  })

  it('shows preview with Retake and Use Photo after capture', async () => {
    mockUseCameraPermissions.mockReturnValue([
      { granted: true },
      requestPermission,
    ])
    mockTakePictureAsync.mockResolvedValue({ uri: 'file:///captured.jpg' })

    const { getByTestId, getByText, queryByTestId } = render(
      <CameraViewfinder onCapture={onCapture} onCancel={onCancel} />
    )

    expect(getByTestId('camera')).toBeTruthy()

    await act(async () => {
      fireEvent.press(getByTestId('capture-button'))
    })

    await waitFor(() => {
      expect(getByTestId('preview')).toBeTruthy()
    })
    expect(getByText('Retake')).toBeTruthy()
    expect(getByText('Use Photo')).toBeTruthy()
  })

  it('returns to camera when Retake is pressed after capture', async () => {
    mockUseCameraPermissions.mockReturnValue([
      { granted: true },
      requestPermission,
    ])
    mockTakePictureAsync.mockResolvedValue({ uri: 'file:///captured.jpg' })

    const { getByTestId, getByText } = render(
      <CameraViewfinder onCapture={onCapture} onCancel={onCancel} />
    )

    await act(async () => {
      fireEvent.press(getByTestId('capture-button'))
    })

    await waitFor(() => {
      expect(getByText('Retake')).toBeTruthy()
    })

    fireEvent.press(getByText('Retake'))

    expect(getByTestId('camera')).toBeTruthy()
  })

  it('processes photo and calls onCapture when Use Photo is pressed', async () => {
    mockUseCameraPermissions.mockReturnValue([
      { granted: true },
      requestPermission,
    ])
    mockTakePictureAsync.mockResolvedValue({ uri: 'file:///captured.jpg' })
    mockProcessPhoto.mockResolvedValue({
      uri: 'file:///processed.jpg',
      base64: 'processed-base64-data',
      type: 'detail',
    })

    const { getByTestId, getByText } = render(
      <CameraViewfinder onCapture={onCapture} onCancel={onCancel} />
    )

    await act(async () => {
      fireEvent.press(getByTestId('capture-button'))
    })

    await waitFor(() => {
      expect(getByText('Use Photo')).toBeTruthy()
    })

    await act(async () => {
      fireEvent.press(getByText('Use Photo'))
    })

    await waitFor(() => {
      expect(mockProcessPhoto).toHaveBeenCalledWith('file:///captured.jpg', 'detail')
      expect(onCapture).toHaveBeenCalledWith('processed-base64-data')
    })
  })

  it('calls onCancel when Cancel is pressed on camera view', () => {
    mockUseCameraPermissions.mockReturnValue([
      { granted: true },
      requestPermission,
    ])
    const { getByText } = render(
      <CameraViewfinder onCapture={onCapture} onCancel={onCancel} />
    )
    fireEvent.press(getByText('Cancel'))
    expect(onCancel).toHaveBeenCalled()
  })

  it('shows Grant Permission button when canAskAgain is true', () => {
    mockUseCameraPermissions.mockReturnValue([
      { granted: false, canAskAgain: true },
      requestPermission,
    ])
    const { getByText } = render(
      <CameraViewfinder onCapture={onCapture} onCancel={onCancel} />
    )
    expect(getByText('Grant Permission')).toBeTruthy()
    fireEvent.press(getByText('Grant Permission'))
    expect(requestPermission).toHaveBeenCalled()
  })
})
