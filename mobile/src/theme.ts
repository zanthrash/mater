import { useMemo } from 'react'
import { useColorScheme } from 'react-native'

export const colors = {
  light: {
    // Text — all meet WCAG AA (4.5:1+) against #fff
    title: '#000',           // 21:1
    heading: '#1a1a1a',      // 17.4:1
    label: '#333',           // 12.6:1
    value: '#000',           // 21:1
    body: '#222',            // 15.4:1
    secondary: '#555',       // 7.5:1
    placeholder: '#666',     // 5.7:1

    // Surfaces
    background: '#fff',
    surface: '#f5f5f5',
    surfaceAlt: '#eaf4ff',

    // Borders
    border: '#ccc',
    borderLight: '#ddd',
    separator: '#ddd',

    // Interactive
    primary: '#007AFF',
    success: '#28a745',
    error: '#c00',
    errorBg: '#fdd',
    warning: '#856404',
    warningBg: '#FFF3CD',
    checkmark: '#28a745',

    // Buttons
    buttonDisabledBg: '#ccc',
    buttonDisabledText: '#666',
    secondaryButtonBg: '#f5f5f5',
    secondaryButtonText: '#333',
    secondaryButtonBorder: '#ccc',

    // Input
    inputText: '#000',
    inputBorder: '#999',
    inputBg: '#fff',

    // AI-populated fields
    aiBg: '#E8F4FD',
    aiBadge: '#007AFF20',
    aiBadgeText: '#007AFF',
  },
  dark: {
    // Text — all meet WCAG AA (4.5:1+) against #000
    title: '#fff',           // 21:1
    heading: '#f0f0f0',      // 18.1:1
    label: '#ccc',           // 13.3:1
    value: '#fff',           // 21:1
    body: '#ddd',            // 15.3:1
    secondary: '#aaa',       // 9.0:1
    placeholder: '#888',     // 5.3:1

    // Surfaces
    background: '#000',
    surface: '#1c1c1e',
    surfaceAlt: '#1a2a3a',

    // Borders
    border: '#444',
    borderLight: '#333',
    separator: '#333',

    // Interactive
    primary: '#4da6ff',
    success: '#34d058',
    error: '#ff6b6b',
    errorBg: '#3a1111',
    warning: '#ffd666',
    warningBg: '#3a2f00',
    checkmark: '#34d058',

    // Buttons
    buttonDisabledBg: '#333',
    buttonDisabledText: '#777',
    secondaryButtonBg: '#1c1c1e',
    secondaryButtonText: '#ddd',
    secondaryButtonBorder: '#444',

    // Input
    inputText: '#fff',
    inputBorder: '#555',
    inputBg: '#1c1c1e',

    // AI-populated fields
    aiBg: '#1a2a3a',
    aiBadge: '#4da6ff30',
    aiBadgeText: '#4da6ff',
  },
} as const

export type ThemeColors = typeof colors.light

export function useThemeColors(): ThemeColors {
  const scheme = useColorScheme()
  return useMemo(() => (scheme === 'dark' ? colors.dark : colors.light), [scheme])
}
