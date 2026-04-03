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

jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn().mockResolvedValue({ data: { data: [], total: 0 } }),
    post: jest.fn().mockResolvedValue({ data: {} }),
  })),
}))

it('renders the asset list home screen on startup', () => {
  const { getByText } = render(<App />)
  expect(getByText('Mater')).toBeTruthy()
})

it('shows the new intake button on the home screen', () => {
  const { getByTestId } = render(<App />)
  expect(getByTestId('new-intake-button')).toBeTruthy()
})
