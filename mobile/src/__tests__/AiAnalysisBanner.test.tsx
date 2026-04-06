import React from 'react'
import { render } from '@testing-library/react-native'
import { AiAnalysisBanner } from '../components/AiAnalysisBanner'

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  default: jest.fn().mockReturnValue('light'),
}))

it('renders default message', () => {
  const { getByText } = render(<AiAnalysisBanner />)
  expect(getByText('AI is analyzing your photos...')).toBeTruthy()
})

it('renders custom message', () => {
  const { getByText } = render(<AiAnalysisBanner message="Analyzing your equipment..." />)
  expect(getByText('Analyzing your equipment...')).toBeTruthy()
})

it('has testID', () => {
  const { getByTestId } = render(<AiAnalysisBanner />)
  expect(getByTestId('ai-analysis-banner')).toBeTruthy()
})
