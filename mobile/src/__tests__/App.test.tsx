import React from 'react'
import { render, waitFor } from '@testing-library/react-native'
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

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(),
  hideAsync: jest.fn(),
}))

jest.mock('expo-status-bar', () => ({ StatusBar: () => null }))

jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn().mockResolvedValue({ data: { data: [], total: 0 } }),
    post: jest.fn().mockResolvedValue({ data: {} }),
  })),
}))

jest.mock('../UserContext', () => ({
  UserProvider: ({ children }: { children: React.ReactNode }) => children,
  useUserContext: () => ({
    user: { id: 'test-user', email: 'test@example.com' },
    loading: false,
    login: jest.fn(),
    logout: jest.fn(),
  }),
}))

it('renders the asset list home screen on startup', async () => {
  const { getByText } = render(<App />)
  await waitFor(() => expect(getByText('Asset Intake')).toBeTruthy())
})

it('shows the new intake button on the home screen', async () => {
  const { getByTestId } = render(<App />)
  await waitFor(() => expect(getByTestId('new-intake-button')).toBeTruthy())
})
