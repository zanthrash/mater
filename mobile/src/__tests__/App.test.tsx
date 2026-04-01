import React from 'react'
import { render } from '@testing-library/react-native'
import App from '../App'

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }),
  getCurrentPositionAsync: jest.fn(),
}))

it('renders the overview screen on startup', () => {
  const { getByText } = render(<App />)
  expect(getByText('New Inspection')).toBeTruthy()
})

it('does not show a back button on the overview screen', () => {
  const { queryByTestId } = render(<App />)
  expect(queryByTestId('header-back-button')).toBeNull()
})

it('has no menu button on the overview screen', () => {
  const { queryByTestId } = render(<App />)
  expect(queryByTestId('header-menu-button')).toBeNull()
})
