import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { CaptureFlowScreen } from '../screens/CaptureFlowScreen'
import type { AssetPhoto } from '../state/WizardStateManager'

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  default: jest.fn().mockReturnValue('light'),
}))

jest.mock('../components/CameraViewfinder', () => ({
  CameraViewfinder: ({
    onCapture,
    onCancel,
    label,
  }: {
    onCapture: (b64: string) => void
    onCancel: () => void
    label?: string
  }) => {
    const { TouchableOpacity, Text, View } = require('react-native')
    return (
      <View testID="camera-viewfinder">
        <Text testID="camera-label">{label ?? ''}</Text>
        <TouchableOpacity testID="mock-capture" onPress={() => onCapture('mockbase64')}>
          <Text>Capture</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="mock-cancel" onPress={onCancel}>
          <Text>Cancel</Text>
        </TouchableOpacity>
      </View>
    )
  },
}))

const wrap = (node: React.ReactElement) => <SafeAreaProvider>{node}</SafeAreaProvider>

const defaultProps = {
  checklist: ['Front', 'Rear', 'Left Side'],
  photos: [] as AssetPhoto[],
  skippedLabels: [] as string[],
  startFrom: null,
  onPhotoCapture: jest.fn(),
  onSkip: jest.fn(),
  onComplete: jest.fn(),
  onExit: jest.fn(),
}

beforeEach(() => {
  jest.clearAllMocks()
})

it('calls onComplete immediately when queue is empty (all captured)', () => {
  const photos: AssetPhoto[] = [
    { uri: 'data:image/jpeg;base64,a', base64: 'a', label: 'Front', type: 'guided' },
    { uri: 'data:image/jpeg;base64,b', base64: 'b', label: 'Rear', type: 'guided' },
    { uri: 'data:image/jpeg;base64,c', base64: 'c', label: 'Left Side', type: 'guided' },
  ]
  const onComplete = jest.fn()
  render(wrap(<CaptureFlowScreen {...defaultProps} photos={photos} onComplete={onComplete} />))
  expect(onComplete).toHaveBeenCalledTimes(1)
})

it('starts camera with first uncaptured item label', () => {
  const { getByTestId } = render(wrap(<CaptureFlowScreen {...defaultProps} />))
  expect(getByTestId('camera-viewfinder')).toBeTruthy()
  expect(getByTestId('camera-label').props.children).toBe('Front')
})

it('starts from specified item when startFrom is provided', () => {
  const { getByTestId } = render(
    wrap(<CaptureFlowScreen {...defaultProps} startFrom="Rear" />)
  )
  expect(getByTestId('camera-label').props.children).toBe('Rear')
})

it('shows progress strip with correct position and list/skip buttons', () => {
  const { getByTestId } = render(wrap(<CaptureFlowScreen {...defaultProps} />))
  expect(getByTestId('flow-skip-button')).toBeTruthy()
  expect(getByTestId('flow-list-button')).toBeTruthy()
})

it('taking a photo calls onPhotoCapture and advances to interstitial', () => {
  const onPhotoCapture = jest.fn()
  const { getByTestId } = render(
    wrap(<CaptureFlowScreen {...defaultProps} onPhotoCapture={onPhotoCapture} />)
  )
  fireEvent.press(getByTestId('mock-capture'))
  expect(onPhotoCapture).toHaveBeenCalledWith(
    expect.objectContaining({ label: 'Front', type: 'guided', base64: 'mockbase64' })
  )
  expect(getByTestId('capture-flow-interstitial')).toBeTruthy()
})

it('interstitial shows confirmed label and next label', () => {
  const { getByTestId, getByText } = render(wrap(<CaptureFlowScreen {...defaultProps} />))
  fireEvent.press(getByTestId('mock-capture'))
  expect(getByText('Front — saved')).toBeTruthy()
  expect(getByText('Rear')).toBeTruthy()
})

it('Ready button on interstitial returns to camera for next item', () => {
  const { getByTestId } = render(wrap(<CaptureFlowScreen {...defaultProps} />))
  fireEvent.press(getByTestId('mock-capture'))
  fireEvent.press(getByTestId('interstitial-ready-button'))
  expect(getByTestId('camera-viewfinder')).toBeTruthy()
  expect(getByTestId('camera-label').props.children).toBe('Rear')
})

it('Skip on camera calls onSkip and advances to next item', () => {
  const onSkip = jest.fn()
  const { getByTestId } = render(
    wrap(<CaptureFlowScreen {...defaultProps} onSkip={onSkip} />)
  )
  fireEvent.press(getByTestId('flow-skip-button'))
  expect(onSkip).toHaveBeenCalledWith('Front')
  expect(getByTestId('camera-label').props.children).toBe('Rear')
})

it('Skip on interstitial skips next item and goes to camera for item after', () => {
  const onSkip = jest.fn()
  const { getByTestId } = render(
    wrap(<CaptureFlowScreen {...defaultProps} onSkip={onSkip} />)
  )
  fireEvent.press(getByTestId('mock-capture'))  // capture Front → interstitial for Rear
  fireEvent.press(getByTestId('interstitial-skip-button'))  // skip Rear
  expect(onSkip).toHaveBeenCalledWith('Rear')
  expect(getByTestId('camera-label').props.children).toBe('Left Side')
})

it('capturing last item calls onComplete', () => {
  const onComplete = jest.fn()
  const checklist = ['Front']
  const { getByTestId } = render(
    wrap(<CaptureFlowScreen {...defaultProps} checklist={checklist} onComplete={onComplete} />)
  )
  fireEvent.press(getByTestId('mock-capture'))
  expect(onComplete).toHaveBeenCalledTimes(1)
})

it('skipping last item from interstitial calls onComplete', () => {
  const onComplete = jest.fn()
  const checklist = ['Front', 'Rear']
  const { getByTestId } = render(
    wrap(<CaptureFlowScreen {...defaultProps} checklist={checklist} onComplete={onComplete} />)
  )
  fireEvent.press(getByTestId('mock-capture'))  // capture Front → interstitial for Rear
  fireEvent.press(getByTestId('interstitial-skip-button'))  // skip Rear (last item)
  expect(onComplete).toHaveBeenCalledTimes(1)
})

it('list button calls onExit', () => {
  const onExit = jest.fn()
  const { getByTestId } = render(
    wrap(<CaptureFlowScreen {...defaultProps} onExit={onExit} />)
  )
  fireEvent.press(getByTestId('flow-list-button'))
  expect(onExit).toHaveBeenCalledTimes(1)
})

it('cancel on CameraViewfinder calls onExit', () => {
  const onExit = jest.fn()
  const { getByTestId } = render(
    wrap(<CaptureFlowScreen {...defaultProps} onExit={onExit} />)
  )
  fireEvent.press(getByTestId('mock-cancel'))
  expect(onExit).toHaveBeenCalledTimes(1)
})

it('excludes already-captured items from queue', () => {
  const photos: AssetPhoto[] = [
    { uri: 'data:image/jpeg;base64,a', base64: 'a', label: 'Front', type: 'guided' },
  ]
  const { getByTestId } = render(
    wrap(<CaptureFlowScreen {...defaultProps} photos={photos} />)
  )
  // Queue should start at Rear (Front is already captured)
  expect(getByTestId('camera-label').props.children).toBe('Rear')
})

it('when startFrom=null, excludes skipped items from queue', () => {
  const { getByTestId } = render(
    wrap(
      <CaptureFlowScreen
        {...defaultProps}
        skippedLabels={['Front']}
        startFrom={null}
      />
    )
  )
  // Front is skipped, queue should start at Rear
  expect(getByTestId('camera-label').props.children).toBe('Rear')
})

it('when startFrom is a label, includes it even if previously skipped', () => {
  const { getByTestId } = render(
    wrap(
      <CaptureFlowScreen
        {...defaultProps}
        skippedLabels={['Front']}
        startFrom="Front"
      />
    )
  )
  // Explicit startFrom overrides skip exclusion
  expect(getByTestId('camera-label').props.children).toBe('Front')
})
