import React from 'react'
import { render, fireEvent, act } from '@testing-library/react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { TaxonomyValidationScreen } from '../screens/TaxonomyValidationScreen'
import type { ClassificationResult, TaxonomyCategoryNode } from '../services/APIClient'

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
    types: [{ type: 'Excavator', subtypes: ['Mini', 'Standard'] }],
  },
]

const classification: ClassificationResult = {
  taxonomy: { category: 'Earthmoving', type: 'Excavator', subtype: 'Mini', confidence: 0.92 },
  photoChecklist: ['Front', 'Rear', 'Engine Compartment', 'Serial Plate'],
}

const wrap = (node: React.ReactElement) => <SafeAreaProvider>{node}</SafeAreaProvider>

// ── Loading state ─────────────────────────────────────────────────────────────

it('shows loading skeleton when classificationLoading and no result', () => {
  const { getByTestId } = render(
    wrap(
      <TaxonomyValidationScreen
        classificationResult={null}
        classificationLoading
        taxonomyTree={tree}
        onConfirm={jest.fn()}
      />
    )
  )
  expect(getByTestId('taxonomy-validation-skeleton')).toBeTruthy()
})

it('disables Looks Good button while loading', () => {
  const { getByTestId } = render(
    wrap(
      <TaxonomyValidationScreen
        classificationResult={null}
        classificationLoading
        taxonomyTree={tree}
        onConfirm={jest.fn()}
      />
    )
  )
  expect(getByTestId('confirm-button').props.accessibilityState?.disabled).toBe(true)
})

it('shows AI analysis banner while loading', () => {
  const { getByTestId } = render(
    wrap(
      <TaxonomyValidationScreen
        classificationResult={null}
        classificationLoading
        taxonomyTree={tree}
        onConfirm={jest.fn()}
      />
    )
  )
  expect(getByTestId('ai-analysis-banner')).toBeTruthy()
})

it('shows checklist skeleton while loading', () => {
  const { getByTestId } = render(
    wrap(
      <TaxonomyValidationScreen
        classificationResult={null}
        classificationLoading
        taxonomyTree={tree}
        onConfirm={jest.fn()}
      />
    )
  )
  expect(getByTestId('checklist-skeleton')).toBeTruthy()
})

it('disables Change Classification button while loading', () => {
  const { getByTestId } = render(
    wrap(
      <TaxonomyValidationScreen
        classificationResult={null}
        classificationLoading
        taxonomyTree={tree}
        onConfirm={jest.fn()}
      />
    )
  )
  expect(getByTestId('change-classification-button').props.accessibilityState?.disabled).toBe(true)
})

// ── Classification display ────────────────────────────────────────────────────

it('shows AI classification result', () => {
  const { getByText } = render(
    wrap(
      <TaxonomyValidationScreen
        classificationResult={classification}
        classificationLoading={false}
        taxonomyTree={tree}
        onConfirm={jest.fn()}
      />
    )
  )
  expect(getByText('Earthmoving')).toBeTruthy()
  expect(getByText('Excavator')).toBeTruthy()
  expect(getByText('Mini')).toBeTruthy()
})

it('shows confidence percentage', () => {
  const { getByText } = render(
    wrap(
      <TaxonomyValidationScreen
        classificationResult={classification}
        classificationLoading={false}
        taxonomyTree={tree}
        onConfirm={jest.fn()}
      />
    )
  )
  expect(getByText('92% confident')).toBeTruthy()
})

it('shows photo checklist items', () => {
  const { getByText } = render(
    wrap(
      <TaxonomyValidationScreen
        classificationResult={classification}
        classificationLoading={false}
        taxonomyTree={tree}
        onConfirm={jest.fn()}
      />
    )
  )
  expect(getByText('Front')).toBeTruthy()
  expect(getByText('Engine Compartment')).toBeTruthy()
})

// ── Confirm ───────────────────────────────────────────────────────────────────

it('calls onConfirm with taxonomy and checklist when Looks Good pressed', () => {
  const onConfirm = jest.fn()
  const { getByTestId } = render(
    wrap(
      <TaxonomyValidationScreen
        classificationResult={classification}
        classificationLoading={false}
        taxonomyTree={tree}
        onConfirm={onConfirm}
      />
    )
  )
  fireEvent.press(getByTestId('confirm-button'))
  expect(onConfirm).toHaveBeenCalledWith(
    { category: 'Earthmoving', type: 'Excavator', subtype: 'Mini' },
    ['Front', 'Rear', 'Engine Compartment', 'Serial Plate']
  )
})

// ── Override ──────────────────────────────────────────────────────────────────

it('shows Change Classification button', () => {
  const { getByTestId } = render(
    wrap(
      <TaxonomyValidationScreen
        classificationResult={classification}
        classificationLoading={false}
        taxonomyTree={tree}
        onConfirm={jest.fn()}
      />
    )
  )
  expect(getByTestId('change-classification-button')).toBeTruthy()
})

it('updates displayed taxonomy when user selects different classification', () => {
  const { getByTestId, getByText } = render(
    wrap(
      <TaxonomyValidationScreen
        classificationResult={classification}
        classificationLoading={false}
        taxonomyTree={tree}
        onConfirm={jest.fn()}
      />
    )
  )
  fireEvent.press(getByTestId('change-classification-button'))
  fireEvent.press(getByTestId('picker-item-Earthmoving'))
  fireEvent.press(getByTestId('picker-item-Excavator'))
  fireEvent.press(getByTestId('picker-item-Standard'))
  expect(getByText('Standard')).toBeTruthy()
})

it('calls onConfirm with overridden taxonomy when confirmed after change', () => {
  const onConfirm = jest.fn()
  const { getByTestId } = render(
    wrap(
      <TaxonomyValidationScreen
        classificationResult={classification}
        classificationLoading={false}
        taxonomyTree={tree}
        onConfirm={onConfirm}
      />
    )
  )
  fireEvent.press(getByTestId('change-classification-button'))
  fireEvent.press(getByTestId('picker-item-Earthmoving'))
  fireEvent.press(getByTestId('picker-item-Excavator'))
  fireEvent.press(getByTestId('picker-item-Standard'))
  fireEvent.press(getByTestId('confirm-button'))
  expect(onConfirm).toHaveBeenCalledWith(
    { category: 'Earthmoving', type: 'Excavator', subtype: 'Standard' },
    expect.any(Array)
  )
})

// ── Staggered reveal ──────────────────────────────────────────────────────────

it('reveals checklist items progressively after result arrives', async () => {
  jest.useFakeTimers()
  const { rerender, queryByText } = render(
    wrap(
      <TaxonomyValidationScreen
        classificationResult={null}
        classificationLoading
        taxonomyTree={tree}
        onConfirm={jest.fn()}
      />
    )
  )

  // Result arrives
  rerender(
    wrap(
      <TaxonomyValidationScreen
        classificationResult={classification}
        classificationLoading={false}
        taxonomyTree={tree}
        onConfirm={jest.fn()}
      />
    )
  )

  // After enough time for all items to reveal (4 items * 60ms = 240ms)
  act(() => { jest.advanceTimersByTime(300) })

  expect(queryByText('Front')).toBeTruthy()
  expect(queryByText('Serial Plate')).toBeTruthy()

  jest.useRealTimers()
})

it('disables Looks Good until reveal completes', () => {
  jest.useFakeTimers()
  const { rerender, getByTestId } = render(
    wrap(
      <TaxonomyValidationScreen
        classificationResult={null}
        classificationLoading
        taxonomyTree={tree}
        onConfirm={jest.fn()}
      />
    )
  )

  rerender(
    wrap(
      <TaxonomyValidationScreen
        classificationResult={classification}
        classificationLoading={false}
        taxonomyTree={tree}
        onConfirm={jest.fn()}
      />
    )
  )

  // Before reveal completes
  act(() => { jest.advanceTimersByTime(0) })
  expect(getByTestId('confirm-button').props.accessibilityState?.disabled).toBe(true)

  // After reveal completes
  act(() => { jest.advanceTimersByTime(300) })
  expect(getByTestId('confirm-button').props.accessibilityState?.disabled).not.toBe(true)

  jest.useRealTimers()
})
