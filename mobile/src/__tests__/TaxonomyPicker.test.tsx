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
  const { getByTestId } = render(
    <TaxonomyPicker taxonomyTree={tree} value={baseValue} onChange={noop} />
  )
  fireEvent.press(getByTestId('taxonomy-picker-display'))
  expect(getByTestId('picker-item-Earthmoving')).toBeTruthy()
  expect(getByTestId('picker-item-Lifting')).toBeTruthy()
})

it('shows type list after selecting a category', () => {
  const { getByTestId, queryByTestId } = render(
    <TaxonomyPicker taxonomyTree={tree} value={baseValue} onChange={noop} />
  )
  fireEvent.press(getByTestId('taxonomy-picker-display'))
  fireEvent.press(getByTestId('picker-item-Earthmoving'))
  expect(getByTestId('picker-item-Excavator')).toBeTruthy()
  expect(getByTestId('picker-item-Bulldozer')).toBeTruthy()
  expect(queryByTestId('picker-item-Lifting')).toBeNull()
})

it('shows subtype list after selecting a type with subtypes', () => {
  const { getByTestId, queryByTestId } = render(
    <TaxonomyPicker taxonomyTree={tree} value={baseValue} onChange={noop} />
  )
  fireEvent.press(getByTestId('taxonomy-picker-display'))
  fireEvent.press(getByTestId('picker-item-Earthmoving'))
  fireEvent.press(getByTestId('picker-item-Excavator'))
  expect(getByTestId('picker-item-Mini')).toBeTruthy()
  expect(getByTestId('picker-item-Standard')).toBeTruthy()
  expect(queryByTestId('picker-item-Excavator')).toBeNull()
})

it('calls onChange with selected values and closes when subtype selected', () => {
  const onChange = jest.fn()
  const { getByTestId } = render(
    <TaxonomyPicker taxonomyTree={tree} value={baseValue} onChange={onChange} />
  )
  fireEvent.press(getByTestId('taxonomy-picker-display'))
  fireEvent.press(getByTestId('picker-item-Earthmoving'))
  fireEvent.press(getByTestId('picker-item-Excavator'))
  fireEvent.press(getByTestId('picker-item-Standard'))
  expect(onChange).toHaveBeenCalledWith({ category: 'Earthmoving', type: 'Excavator', subtype: 'Standard' })
})

it('calls onChange with null subtype and closes when type has no subtypes', () => {
  const onChange = jest.fn()
  const { getByTestId } = render(
    <TaxonomyPicker taxonomyTree={tree} value={baseValue} onChange={onChange} />
  )
  fireEvent.press(getByTestId('taxonomy-picker-display'))
  fireEvent.press(getByTestId('picker-item-Earthmoving'))
  fireEvent.press(getByTestId('picker-item-Bulldozer'))
  expect(onChange).toHaveBeenCalledWith({ category: 'Earthmoving', type: 'Bulldozer', subtype: null })
})

it('navigates back to category list from type list', () => {
  const { getByTestId, queryByTestId } = render(
    <TaxonomyPicker taxonomyTree={tree} value={baseValue} onChange={noop} />
  )
  fireEvent.press(getByTestId('taxonomy-picker-display'))
  fireEvent.press(getByTestId('picker-item-Earthmoving'))
  expect(queryByTestId('picker-item-Lifting')).toBeNull()
  fireEvent.press(getByTestId('picker-back-button'))
  expect(getByTestId('picker-item-Lifting')).toBeTruthy()
})
