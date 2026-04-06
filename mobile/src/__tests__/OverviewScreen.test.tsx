import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { OverviewScreen } from '../screens/OverviewScreen'

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  default: jest.fn().mockReturnValue('light'),
}))

it('pre-populates photo from initialPhoto prop', () => {
  const { getByTestId, queryByTestId } = render(
    <OverviewScreen
      initialPhoto="existingbase64"
      onContinue={jest.fn()}
    />
  )
  expect(getByTestId('overview-thumbnail')).toBeTruthy()
  expect(queryByTestId('take-photo-button')).toBeNull()
})

it('shows retake option when a photo is present', () => {
  const { getByTestId, getByText } = render(
    <OverviewScreen
      initialPhoto="existingbase64"
      onContinue={jest.fn()}
    />
  )
  expect(getByTestId('overview-thumbnail')).toBeTruthy()
  expect(getByText('Tap to retake')).toBeTruthy()
})

it('hides take-photo button when a photo is present', () => {
  const { queryByTestId } = render(
    <OverviewScreen
      initialPhoto="existingbase64"
      onPhotoChange={jest.fn()}
      onContinue={jest.fn()}
    />
  )
  expect(queryByTestId('take-photo-button')).toBeNull()
})
