import React from 'react'
import { render } from '@testing-library/react-native'
import App from '../App'

it('renders Hello World', () => {
  const { getByText } = render(<App />)
  expect(getByText('Hello World')).toBeTruthy()
})
