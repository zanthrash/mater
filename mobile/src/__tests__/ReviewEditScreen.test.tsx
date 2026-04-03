import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react-native'
import { ReviewEditScreen } from '../screens/ReviewEditScreen'

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  default: jest.fn().mockReturnValue('light'),
}))

const baseTaxonomy = { category: 'Construction', type: 'Excavator', subtype: 'Mini' }

const baseCoreSpecs = {
  make: 'Caterpillar',
  model: '320',
  year: 2020,
  engineType: 'Diesel',
  transmission: 'Automatic',
  gvwLbs: 45000,
  hoursOnMeter: 1500,
}

const baseVinResult = {
  make: 'Caterpillar',
  model: '320',
  year: 2020,
  engineType: 'Diesel',
  transmission: 'Automatic',
  gvwLbs: 45000,
  source: 'nhtsa' as const,
}

const baseTypeSpecs = { bucketCapacity: '1.2 m³', boomLength: '6m' }

const basePhotos = [
  { uri: 'file://photo1.jpg', label: 'Front', type: 'guided' as const },
  { uri: 'file://photo2.jpg', label: 'Side', type: 'guided' as const },
]

const defaultProps = {
  taxonomy: baseTaxonomy,
  coreSpecs: baseCoreSpecs,
  typeSpecificSpecs: baseTypeSpecs,
  vinResult: baseVinResult,
  photos: basePhotos,
  taxonomyTree: [],
  onSubmit: jest.fn().mockResolvedValue(undefined),
}

// ── Test 1: Taxonomy fields pre-filled ────────────────────────────────────────

it('renders taxonomy fields pre-filled from props', () => {
  const { getByTestId } = render(<ReviewEditScreen {...defaultProps} />)

  expect(getByTestId('taxonomy-category').props.value).toBe('Construction')
  expect(getByTestId('taxonomy-type').props.value).toBe('Excavator')
  expect(getByTestId('taxonomy-subtype').props.value).toBe('Mini')
})

// ── Test 2: Core spec fields pre-filled ───────────────────────────────────────

it('renders core spec fields with correct values', () => {
  const { getByTestId } = render(<ReviewEditScreen {...defaultProps} />)

  expect(getByTestId('spec-make').props.value).toBe('Caterpillar')
  expect(getByTestId('spec-model').props.value).toBe('320')
  expect(getByTestId('spec-year').props.value).toBe('2020')
})

// ── Test 3: Conflict indicator shown when AI and VIN disagree ─────────────────

it('shows conflict indicator when AI and VIN values disagree', () => {
  const conflictingCoreSpecs = { ...baseCoreSpecs, make: 'John Deere' }
  // vinResult still has make: 'Caterpillar' — conflict on make

  const { getByTestId, getByText } = render(
    <ReviewEditScreen
      {...defaultProps}
      coreSpecs={conflictingCoreSpecs}
    />,
  )

  expect(getByTestId('conflict-row-make')).toBeTruthy()
  expect(getByText('AI: John Deere')).toBeTruthy()
  expect(getByText('VIN: Caterpillar')).toBeTruthy()
})

// ── Test 4: Save button calls onSubmit with correct data shape ────────────────

it('save button calls onSubmit with correct data shape', async () => {
  const onSubmit = jest.fn().mockResolvedValue(undefined)
  const { getByTestId } = render(
    <ReviewEditScreen {...defaultProps} onSubmit={onSubmit} />,
  )

  fireEvent.press(getByTestId('save-button'))

  await waitFor(() => {
    expect(onSubmit).toHaveBeenCalledTimes(1)
    const arg = onSubmit.mock.calls[0][0]
    expect(arg.taxonomy).toEqual({ category: 'Construction', type: 'Excavator', subtype: 'Mini' })
    expect(arg.coreSpecs.make).toBe('Caterpillar')
    expect(arg.coreSpecs.year).toBe(2020)
    expect(arg.typeSpecificSpecs).toHaveProperty('bucketCapacity')
    expect(arg.yardMetadata).toBeDefined()
  })
})

// ── Test 5: Yard metadata inputs rendered ────────────────────────────────────

it('shows yard metadata inputs', () => {
  const { getByTestId } = render(
    <ReviewEditScreen
      {...defaultProps}
      yardMetadata={{ lotNumber: 'L-42', yardLocation: 'Bay 3', consignor: 'Acme Corp' }}
    />,
  )

  expect(getByTestId('yard-lot-number').props.value).toBe('L-42')
  expect(getByTestId('yard-location').props.value).toBe('Bay 3')
  expect(getByTestId('yard-consignor').props.value).toBe('Acme Corp')
})

// ── Test 6: Add Spec button adds a new type-specific spec row ─────────────────

it('Add Spec button adds a new type-specific spec row', () => {
  const { getByTestId, queryByTestId } = render(<ReviewEditScreen {...defaultProps} />)

  // Existing rows: index 0 (bucketCapacity) and 1 (boomLength)
  expect(getByTestId('type-spec-key-0')).toBeTruthy()
  expect(getByTestId('type-spec-key-1')).toBeTruthy()
  expect(queryByTestId('type-spec-key-2')).toBeNull()

  fireEvent.press(getByTestId('add-spec-button'))

  expect(getByTestId('type-spec-key-2')).toBeTruthy()
})
