import React from 'react'
import { render, fireEvent, waitFor, act } from '@testing-library/react-native'
import { ReviewEditScreen } from '../screens/ReviewEditScreen'

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}))

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
  aiLoading: false,
  aiError: false,
}

// ── Test 1: Taxonomy picker pre-filled ───────────────────────────────────────

it('renders taxonomy picker pre-filled from props', () => {
  const { getByTestId, getByText } = render(<ReviewEditScreen {...defaultProps} />)

  expect(getByTestId('taxonomy-picker-display')).toBeTruthy()
  expect(getByText('Construction › Excavator › Mini')).toBeTruthy()
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

// ── AI feature tests ──────────────────────────────────────────────────────────

const nullCoreSpecs = {
  make: null,
  model: null,
  year: null,
  engineType: null,
  transmission: null,
  gvwLbs: null,
  hoursOnMeter: null,
}

describe('AI loading state', () => {
  it('shows shimmer for Core Specs when aiLoading is true', () => {
    const { getByTestId } = render(<ReviewEditScreen {...defaultProps} aiLoading={true} />)
    expect(getByTestId('ai-loading-core-specs')).toBeTruthy()
  })

  it('shows shimmer for Type-Specific Specs when aiLoading is true', () => {
    const { getByTestId } = render(<ReviewEditScreen {...defaultProps} aiLoading={true} />)
    expect(getByTestId('ai-loading-type-specs')).toBeTruthy()
  })

  it('does not show shimmer when aiLoading is false', () => {
    const { queryByTestId } = render(<ReviewEditScreen {...defaultProps} aiLoading={false} />)
    expect(queryByTestId('ai-loading-core-specs')).toBeNull()
  })
})

describe('AI error state', () => {
  it('shows error banner when aiError is true', () => {
    const { getByTestId } = render(<ReviewEditScreen {...defaultProps} aiError={true} />)
    expect(getByTestId('ai-error-banner')).toBeTruthy()
  })

  it('does not show error banner when aiError is false', () => {
    const { queryByTestId } = render(<ReviewEditScreen {...defaultProps} aiError={false} />)
    expect(queryByTestId('ai-error-banner')).toBeNull()
  })

  it('calls onRetryAnalysis when retry button is pressed', () => {
    const onRetryAnalysis = jest.fn()
    const { getByTestId } = render(
      <ReviewEditScreen {...defaultProps} aiError={true} onRetryAnalysis={onRetryAnalysis} />,
    )
    fireEvent.press(getByTestId('ai-retry-button'))
    expect(onRetryAnalysis).toHaveBeenCalledTimes(1)
  })

  it('hides banner when dismiss button is pressed', () => {
    const { getByTestId, queryByTestId } = render(
      <ReviewEditScreen {...defaultProps} aiError={true} />,
    )
    fireEvent.press(getByTestId('ai-dismiss-button'))
    expect(queryByTestId('ai-error-banner')).toBeNull()
  })
})

describe('AI field indicators', () => {
  it('shows AI badge for fields with AI-populated coreSpecs', () => {
    const { getByTestId, queryByTestId } = render(
      <ReviewEditScreen
        {...defaultProps}
        coreSpecs={{ make: 'Caterpillar', model: null, year: null, engineType: null, transmission: null, gvwLbs: null, hoursOnMeter: null }}
      />,
    )
    expect(getByTestId('ai-badge-make')).toBeTruthy()
    expect(queryByTestId('ai-badge-model')).toBeNull()
  })

  it('removes AI badge when user edits a field', () => {
    const { getByTestId, queryByTestId } = render(
      <ReviewEditScreen
        {...defaultProps}
        coreSpecs={{ make: 'Caterpillar', model: null, year: null, engineType: null, transmission: null, gvwLbs: null, hoursOnMeter: null }}
      />,
    )
    expect(getByTestId('ai-badge-make')).toBeTruthy()
    fireEvent.changeText(getByTestId('spec-make'), 'John Deere')
    expect(queryByTestId('ai-badge-make')).toBeNull()
  })
})

const nullVinResult = {
  make: null,
  model: null,
  year: null,
  engineType: null,
  transmission: null,
  gvwLbs: null,
  source: 'nhtsa' as const,
}

describe('async AI result reactivity', () => {
  it('updates form fields when coreSpecs prop changes', async () => {
    const { getByTestId, rerender } = render(
      <ReviewEditScreen {...defaultProps} coreSpecs={nullCoreSpecs} vinResult={nullVinResult} />,
    )
    expect(getByTestId('spec-make').props.value).toBe('')

    await act(async () => {
      rerender(
        <ReviewEditScreen
          {...defaultProps}
          coreSpecs={{ ...nullCoreSpecs, make: 'Caterpillar' }}
          vinResult={nullVinResult}
        />,
      )
    })

    expect(getByTestId('spec-make').props.value).toBe('Caterpillar')
  })

  it('does not overwrite manually edited fields when coreSpecs arrives', async () => {
    const { getByTestId, rerender } = render(
      <ReviewEditScreen {...defaultProps} coreSpecs={nullCoreSpecs} vinResult={nullVinResult} />,
    )

    fireEvent.changeText(getByTestId('spec-make'), 'Komatsu')

    await act(async () => {
      rerender(
        <ReviewEditScreen
          {...defaultProps}
          coreSpecs={{ ...nullCoreSpecs, make: 'Caterpillar' }}
          vinResult={nullVinResult}
        />,
      )
    })

    expect(getByTestId('spec-make').props.value).toBe('Komatsu')
  })
})
