import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { Alert } from 'react-native'
import { WizardHeader } from '../components/WizardHeader'

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  default: jest.fn().mockReturnValue('light'),
}))

describe('WizardHeader', () => {
  it('renders the title', () => {
    const { getByText } = render(<WizardHeader title="VIN Entry" />)
    expect(getByText('VIN Entry')).toBeTruthy()
  })

  it('hides back button by default', () => {
    const { queryByTestId } = render(<WizardHeader title="Test" />)
    expect(queryByTestId('header-back-button')).toBeNull()
  })

  it('shows back button when showBack=true and calls onBack when pressed', () => {
    const onBack = jest.fn()
    const { getByTestId } = render(
      <WizardHeader title="Test" showBack onBack={onBack} />
    )
    fireEvent.press(getByTestId('header-back-button'))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('hides menu button by default', () => {
    const { queryByTestId } = render(<WizardHeader title="Test" />)
    expect(queryByTestId('header-menu-button')).toBeNull()
  })

  it('shows menu button when showMenu=true', () => {
    const { getByTestId } = render(<WizardHeader title="Test" showMenu />)
    expect(getByTestId('header-menu-button')).toBeTruthy()
  })

  it('pressing menu button shows restart confirmation alert', () => {
    const onRestart = jest.fn()
    const alertSpy = jest.spyOn(Alert, 'alert')
    const { getByTestId } = render(
      <WizardHeader title="Test" showMenu onRestart={onRestart} />
    )
    fireEvent.press(getByTestId('header-menu-button'))
    expect(alertSpy).toHaveBeenCalledWith(
      'Restart Inspection',
      'All progress will be lost. Are you sure?',
      expect.arrayContaining([
        expect.objectContaining({ text: 'Cancel' }),
        expect.objectContaining({ text: 'Yes, Restart', onPress: onRestart }),
      ])
    )
  })
})
