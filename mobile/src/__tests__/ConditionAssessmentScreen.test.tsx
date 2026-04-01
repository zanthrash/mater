import React from 'react'
import { render } from '@testing-library/react-native'
import { ConditionAssessmentScreen } from '../screens/ConditionAssessmentScreen'
import type { ConditionFormData } from '../screens/ConditionAssessmentScreen'

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  default: jest.fn().mockReturnValue('light'),
}))

it('starts with default Good ratings when no initialData', () => {
  const { getAllByText } = render(
    <ConditionAssessmentScreen onContinue={jest.fn()} />
  )
  // "Good" should appear 5 times (one per rating section: overall + engine + hydraulics + undercarriage + cab)
  const goodButtons = getAllByText('Good')
  expect(goodButtons.length).toBeGreaterThanOrEqual(5)
})

it('pre-populates from initialData when provided', () => {
  const initialData: ConditionFormData = {
    overall: 'Excellent',
    engine: { rating: 'Poor', notes: 'Needs oil' },
    hydraulics: { rating: 'Fair', notes: '' },
    undercarriage: { rating: 'Good', notes: '' },
    cab: { rating: 'Salvage', notes: 'Cracked windshield' },
  }
  const { getAllByText } = render(
    <ConditionAssessmentScreen initialData={initialData} onContinue={jest.fn()} />
  )
  expect(getAllByText('Excellent').length).toBeGreaterThanOrEqual(1)
  expect(getAllByText('Poor').length).toBeGreaterThanOrEqual(1)
  expect(getAllByText('Salvage').length).toBeGreaterThanOrEqual(1)
})
