import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { AssetListScreen } from '../screens/AssetListScreen'
import type { Asset } from '../services/APIClient'

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  default: jest.fn().mockReturnValue('light'),
}))

const baseAsset: Asset = {
  id: 'asset-1',
  created_at: '2026-01-15T10:00:00Z',
  updated_at: '2026-01-15T10:00:00Z',
  vin_serial: '1HGCM82633A123456',
  category: 'Heavy Equipment',
  type: 'Excavator',
  subtype: null,
  make: 'Caterpillar',
  model: '320',
  year: 2020,
  engine_type: 'Diesel',
  transmission: 'Automatic',
  gvw_lbs: 50000,
  hours_on_meter: 1200,
  type_specific_specs: {},
  lot_number: 'LOT-001',
  yard_location: 'Section A',
  consignor: 'ACME Corp',
  photos: [],
  status: 'active',
}

const defaultProps = {
  assets: [],
  loading: false,
  onNewIntake: jest.fn(),
  onAssetPress: jest.fn(),
  onSearch: jest.fn(),
}

it('shows "+" button and "Mater" title', () => {
  const { getByText, getByTestId } = render(<AssetListScreen {...defaultProps} />)
  expect(getByText('Mater')).toBeTruthy()
  expect(getByTestId('new-intake-button')).toBeTruthy()
})

it('shows empty state when assets=[] and loading=false', () => {
  const { getByText, getByTestId } = render(
    <AssetListScreen {...defaultProps} assets={[]} loading={false} />
  )
  expect(getByText('No assets ingested yet')).toBeTruthy()
  expect(getByTestId('first-asset-button')).toBeTruthy()
})

it('shows ActivityIndicator when loading=true', () => {
  const { getByTestId, queryByText } = render(
    <AssetListScreen {...defaultProps} loading={true} />
  )
  expect(getByTestId('activity-indicator')).toBeTruthy()
  expect(queryByText('No assets ingested yet')).toBeNull()
})

it('renders asset cards when assets are provided', () => {
  const assets = [baseAsset, { ...baseAsset, id: 'asset-2', make: 'Deere', model: '450' }]
  const { getByTestId } = render(
    <AssetListScreen {...defaultProps} assets={assets} loading={false} />
  )
  expect(getByTestId('asset-card-asset-1')).toBeTruthy()
  expect(getByTestId('asset-card-asset-2')).toBeTruthy()
})

it('calls onAssetPress when asset card is tapped', () => {
  const onAssetPress = jest.fn()
  const { getByTestId } = render(
    <AssetListScreen
      {...defaultProps}
      assets={[baseAsset]}
      loading={false}
      onAssetPress={onAssetPress}
    />
  )
  fireEvent.press(getByTestId('asset-card-asset-1'))
  expect(onAssetPress).toHaveBeenCalledWith('asset-1')
})

it('calls onNewIntake when "+" is pressed', () => {
  const onNewIntake = jest.fn()
  const { getByTestId } = render(
    <AssetListScreen {...defaultProps} onNewIntake={onNewIntake} />
  )
  fireEvent.press(getByTestId('new-intake-button'))
  expect(onNewIntake).toHaveBeenCalledTimes(1)
})
