import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { GuidedPhotosScreen } from '../screens/GuidedPhotosScreen'
import type { AssetPhoto } from '../state/WizardStateManager'

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  default: jest.fn().mockReturnValue('light'),
}))

jest.mock('../components/CameraViewfinder', () => ({
  CameraViewfinder: ({
    onCapture,
    onCancel,
  }: {
    onCapture: (b64: string) => void
    onCancel: () => void
  }) => {
    const { TouchableOpacity, Text, View } = require('react-native')
    return (
      <View testID="camera-viewfinder">
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

const defaultProps = {
  photoChecklist: ['Front', 'Rear'],
  photos: [] as AssetPhoto[],
  onPhotosChange: jest.fn(),
  onContinue: jest.fn(),
}

beforeEach(() => {
  jest.clearAllMocks()
})

it('renders checklist items from photoChecklist prop', () => {
  const { getByTestId } = render(<GuidedPhotosScreen {...defaultProps} />)
  expect(getByTestId('capture-Front')).toBeTruthy()
  expect(getByTestId('capture-Rear')).toBeTruthy()
})

it('shows thumbnail and Retake/Delete buttons for captured photos', () => {
  const photos: AssetPhoto[] = [
    { uri: 'data:image/jpeg;base64,abc', base64: 'abc', label: 'Front', type: 'guided' },
  ]
  const { getByTestId, queryByTestId } = render(
    <GuidedPhotosScreen {...defaultProps} photos={photos} />
  )
  expect(getByTestId('thumbnail-Front')).toBeTruthy()
  expect(getByTestId('retake-Front')).toBeTruthy()
  expect(getByTestId('delete-Front')).toBeTruthy()
  // Rear is not captured — should still show capture button
  expect(queryByTestId('capture-Rear')).toBeTruthy()
})

it('Continue button is disabled when fewer than 3 photos', () => {
  const photos: AssetPhoto[] = [
    { uri: 'data:image/jpeg;base64,a', base64: 'a', label: 'Front', type: 'guided' },
    { uri: 'data:image/jpeg;base64,b', base64: 'b', label: 'Rear', type: 'guided' },
  ]
  const { getByTestId } = render(
    <GuidedPhotosScreen {...defaultProps} photos={photos} />
  )
  const continueBtn = getByTestId('continue-button')
  expect(continueBtn.props.accessibilityState?.disabled).toBeTruthy()
})

it('Continue button is enabled and calls onContinue when 3+ photos', () => {
  const onContinue = jest.fn()
  const photos: AssetPhoto[] = [
    { uri: 'data:image/jpeg;base64,a', base64: 'a', label: 'Front', type: 'guided' },
    { uri: 'data:image/jpeg;base64,b', base64: 'b', label: 'Rear', type: 'guided' },
    { uri: 'data:image/jpeg;base64,c', base64: 'c', label: 'Side', type: 'guided' },
  ]
  const { getByTestId } = render(
    <GuidedPhotosScreen {...defaultProps} photos={photos} onContinue={onContinue} />
  )
  const continueBtn = getByTestId('continue-button')
  expect(continueBtn.props.accessibilityState?.disabled).toBeFalsy()
  fireEvent.press(continueBtn)
  expect(onContinue).toHaveBeenCalledTimes(1)
})

it('Delete button removes photo and calls onPhotosChange without that photo', () => {
  const onPhotosChange = jest.fn()
  const photos: AssetPhoto[] = [
    { uri: 'data:image/jpeg;base64,a', base64: 'a', label: 'Front', type: 'guided' },
    { uri: 'data:image/jpeg;base64,b', base64: 'b', label: 'Rear', type: 'guided' },
  ]
  const { getByTestId } = render(
    <GuidedPhotosScreen {...defaultProps} photos={photos} onPhotosChange={onPhotosChange} />
  )
  fireEvent.press(getByTestId('delete-Front'))
  expect(onPhotosChange).toHaveBeenCalledWith([
    { uri: 'data:image/jpeg;base64,b', base64: 'b', label: 'Rear', type: 'guided' },
  ])
})

it('Add Extra Photo button exists', () => {
  const { getByTestId } = render(<GuidedPhotosScreen {...defaultProps} />)
  expect(getByTestId('add-extra-button')).toBeTruthy()
})
