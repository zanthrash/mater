import React from 'react'
import { render } from '@testing-library/react-native'
import App from '../App'

it('renders the Detail Photos screen by default', () => {
  const { getByText } = render(<App />)
  expect(getByText('Detail Photos')).toBeTruthy()
})
