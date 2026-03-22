import React from 'react'
import { render } from '@testing-library/react-native'
import App from '../App'

it('renders the overview screen on startup', () => {
  const { getByText } = render(<App />)
  expect(getByText('New Inspection')).toBeTruthy()
})
