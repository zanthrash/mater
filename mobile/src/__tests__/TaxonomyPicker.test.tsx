import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { TaxonomyPicker } from '../components/TaxonomyPicker'
import type { TaxonomyCategoryNode } from '../services/APIClient'

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  default: jest.fn().mockReturnValue('light'),
}))

const tree: TaxonomyCategoryNode[] = [
  {
    category: 'Earthmoving',
    types: [
      { type: 'Excavator', subtypes: ['Mini', 'Standard', 'Large'] },
      { type: 'Bulldozer', subtypes: [] },
    ],
  },
  {
    category: 'Lifting',
    types: [{ type: 'Crane', subtypes: ['Tower', 'Mobile'] }],
  },
]

const baseValue = { category: 'Earthmoving', type: 'Excavator', subtype: 'Mini' }
const noop = jest.fn()

// ── Display ───────────────────────────────────────────────────────────────────

it('displays category > type > subtype breadcrumb', () => {
  const { getByTestId, getByText } = render(
    <TaxonomyPicker taxonomyTree={tree} value={baseValue} onChange={noop} />
  )
  expect(getByTestId('taxonomy-picker-display')).toBeTruthy()
  expect(getByText('Earthmoving › Excavator › Mini')).toBeTruthy()
})

it('shows AI badge when isAiPopulated is true', () => {
  const { getByTestId } = render(
    <TaxonomyPicker taxonomyTree={tree} value={baseValue} onChange={noop} isAiPopulated />
  )
  expect(getByTestId('ai-badge')).toBeTruthy()
})

it('does not show AI badge when isAiPopulated is false', () => {
  const { queryByTestId } = render(
    <TaxonomyPicker taxonomyTree={tree} value={baseValue} onChange={noop} />
  )
  expect(queryByTestId('ai-badge')).toBeNull()
})

// ── Modal navigation ─────────────────────────────────────────────────────────

it('opens category list on field press', () => {
  const { getByTestId, getByText } = render(
    <TaxonomyPicker taxonomyTree={tree} value={baseValue} onChange={noop} />
  )
  fireEvent.press(getByTestId('taxonomy-picker-display'))
  expect(getByText('Earthmoving')).toBeTruthy()
  expect(getByText('Lifting')).toBeTruthy()
})

it('shows type list after selecting a category', () => {
  const { getByTestId, getByText, queryByText } = render(
    <TaxonomyPicker taxonomyTree={tree} value={baseValue} onChange={noop} />
  )
  fireEvent.press(getByTestId('taxonomy-picker-display'))
  fireEvent.press(getByText('Earthmoving'))
  expect(getByText('Excavator')).toBeTruthy()
  expect(getByText('Bulldozer')).toBeTruthy()
  expect(queryByText('Lifting')).toBeNull()
})

it('shows subtype list after selecting a type with subtypes', () => {
  const { getByTestId, getByText, queryByText } = render(
    <TaxonomyPicker taxonomyTree={tree} value={baseValue} onChange={noop} />
  )
  fireEvent.press(getByTestId('taxonomy-picker-display'))
  fireEvent.press(getByText('Earthmoving'))
  fireEvent.press(getByText('Excavator'))
  expect(getByText('Mini')).toBeTruthy()
  expect(getByText('Standard')).toBeTruthy()
  expect(queryByText('Excavator')).toBeNull()
})

it('calls onChange with selected values and closes when subtype selected', () => {
  const onChange = jest.fn()
  const { getByTestId, getByText, queryByTestId } = render(
    <TaxonomyPicker taxonomyTree={tree} value={baseValue} onChange={onChange} />
  )
  fireEvent.press(getByTestId('taxonomy-picker-display'))
  fireEvent.press(getByText('Earthmoving'))
  fireEvent.press(getByText('Excavator'))
  fireEvent.press(getByText('Standard'))
  expect(onChange).toHaveBeenCalledWith({ category: 'Earthmoving', type: 'Excavator', subtype: 'Standard' })
})

it('calls onChange with null subtype and closes when type has no subtypes', () => {
  const onChange = jest.fn()
  const { getByTestId, getByText } = render(
    <TaxonomyPicker taxonomyTree={tree} value={baseValue} onChange={onChange} />
  )
  fireEvent.press(getByTestId('taxonomy-picker-display'))
  fireEvent.press(getByText('Earthmoving'))
  fireEvent.press(getByText('Bulldozer'))
  expect(onChange).toHaveBeenCalledWith({ category: 'Earthmoving', type: 'Bulldozer', subtype: null })
})

it('navigates back to category list from type list', () => {
  const { getByTestId, getByText, queryByText } = render(
    <TaxonomyPicker taxonomyTree={tree} value={baseValue} onChange={noop} />
  )
  fireEvent.press(getByTestId('taxonomy-picker-display'))
  fireEvent.press(getByText('Earthmoving'))
  expect(queryByText('Lifting')).toBeNull()
  fireEvent.press(getByTestId('picker-back-button'))
  expect(getByText('Lifting')).toBeTruthy()
})
