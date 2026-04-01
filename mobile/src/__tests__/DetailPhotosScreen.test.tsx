import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { DetailPhotosScreen } from '../screens/DetailPhotosScreen'

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  default: jest.fn().mockReturnValue('light'),
}))

it('displays thumbnails for photos passed via prop', () => {
  const { getByTestId } = render(
    <DetailPhotosScreen
      photos={['base64photo1', 'base64photo2']}
      onPhotosChange={jest.fn()}
      onAnalysisComplete={jest.fn()}
    />
  )
  expect(getByTestId('thumbnail-0')).toBeTruthy()
  expect(getByTestId('thumbnail-1')).toBeTruthy()
})

it('calls onPhotosChange without deleted photo when delete button pressed', () => {
  const onPhotosChange = jest.fn()
  const { getByTestId } = render(
    <DetailPhotosScreen
      photos={['photo1', 'photo2', 'photo3']}
      onPhotosChange={onPhotosChange}
      onAnalysisComplete={jest.fn()}
    />
  )
  fireEvent.press(getByTestId('delete-photo-1'))
  expect(onPhotosChange).toHaveBeenCalledWith(['photo1', 'photo3'])
})
