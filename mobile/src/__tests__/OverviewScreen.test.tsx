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

it('shows delete button when a photo is present', () => {
  const { getByTestId } = render(
    <OverviewScreen
      initialPhoto="existingbase64"
      onContinue={jest.fn()}
    />
  )
  expect(getByTestId('delete-overview-photo')).toBeTruthy()
})

it('pressing delete clears photo and calls onPhotoChange(null)', () => {
  const onPhotoChange = jest.fn()
  const { getByTestId, queryByTestId } = render(
    <OverviewScreen
      initialPhoto="existingbase64"
      onPhotoChange={onPhotoChange}
      onContinue={jest.fn()}
    />
  )
  fireEvent.press(getByTestId('delete-overview-photo'))
  expect(onPhotoChange).toHaveBeenCalledWith(null)
  expect(queryByTestId('overview-thumbnail')).toBeNull()
})
