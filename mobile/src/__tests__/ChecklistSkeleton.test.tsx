import React from 'react'
import { render } from '@testing-library/react-native'
import { ChecklistSkeleton } from '../components/ChecklistSkeleton'

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  default: jest.fn().mockReturnValue('light'),
}))

it('renders 5 skeleton rows by default', () => {
  const { getByTestId } = render(<ChecklistSkeleton />)
  const container = getByTestId('checklist-skeleton')
  // 5 rows, each with 3 children (circle, text, button)
  expect(container.children).toHaveLength(5)
})

it('renders custom number of rows', () => {
  const { getByTestId } = render(<ChecklistSkeleton rows={3} />)
  expect(getByTestId('checklist-skeleton').children).toHaveLength(3)
})
