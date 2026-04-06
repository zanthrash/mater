import { useMemo } from 'react'
import { useThemeContext } from './ThemeContext'

export const colors = {
  light: {
    // Text
    title: '#0F172A',
    heading: '#1E293B',
    label: '#334155',
    textValue: '#0F172A',
    body: '#334155',
    secondary: '#475569',
    placeholder: '#94A3B8',

    // Surfaces
    background: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceAlt: '#FFF7ED',

    // Borders
    border: '#E2E8F0',
    borderLight: '#F1F5F9',
    borderStrong: '#CBD5E1',
    separator: '#E2E8F0',

    // Interactive
    primary: '#EA580C',
    primaryHover: '#C2410C',
    onPrimary: '#FFFFFF',
    success: '#16A34A',
    error: '#DC2626',
    errorBg: '#FEF2F2',
    warning: '#D97706',
    warningBg: '#FFFBEB',
    checkmark: '#16A34A',

    // Buttons
    buttonDisabledBg: '#E2E8F0',
    buttonDisabledText: '#94A3B8',
    secondaryButtonBg: '#FFFFFF',
    secondaryButtonText: '#334155',
    secondaryButtonBorder: '#CBD5E1',

    // Input
    inputText: '#0F172A',
    inputBorder: '#CBD5E1',
    inputBg: '#FFFFFF',

    // AI-populated fields
    aiBg: '#EFF6FF',
    aiBadge: 'rgba(59,130,246,0.10)',
    aiBadgeText: '#2563EB',
    aiAccent: '#3B82F6',
    aiBadgeBg: 'rgba(59,130,246,0.10)',
  },
  dark: {
    // Text
    title: '#F8FAFC',
    heading: '#F1F5F9',
    label: '#CBD5E1',
    textValue: '#F8FAFC',
    body: '#E2E8F0',
    secondary: '#94A3B8',
    placeholder: '#64748B',

    // Surfaces
    background: '#0F172A',
    surface: '#1E293B',
    surfaceAlt: '#162032',

    // Borders
    border: 'rgba(255,255,255,0.08)',
    borderLight: 'rgba(255,255,255,0.05)',
    borderStrong: 'rgba(255,255,255,0.15)',
    separator: 'rgba(255,255,255,0.08)',

    // Interactive
    primary: '#EA580C',
    primaryHover: '#F97316',
    onPrimary: '#FFFFFF',
    success: '#22C55E',
    error: '#EF4444',
    errorBg: '#1F1215',
    warning: '#F59E0B',
    warningBg: '#1C1408',
    checkmark: '#22C55E',

    // Buttons
    buttonDisabledBg: '#1E293B',
    buttonDisabledText: '#475569',
    secondaryButtonBg: '#1E293B',
    secondaryButtonText: '#E2E8F0',
    secondaryButtonBorder: 'rgba(255,255,255,0.15)',

    // Input
    inputText: '#F8FAFC',
    inputBorder: 'rgba(255,255,255,0.30)',
    inputBg: '#1E293B',

    // AI-populated fields
    aiBg: 'rgba(59,130,246,0.08)',
    aiBadge: 'rgba(59,130,246,0.20)',
    aiBadgeText: '#93C5FD',
    aiAccent: '#3B82F6',
    aiBadgeBg: 'rgba(59,130,246,0.15)',
  },
} as const

export const typography = {
  headingFamily: 'SpaceGrotesk-Bold',
  bodyFamily: 'Inter-Regular',
  headingWeight: '700' as const,
  bodyWeight: '400' as const,
  labelLetterSpacing: 1.2,

  // Type scale — spread directly into StyleSheet styles
  display:   { fontSize: 36, lineHeight: 44, fontFamily: 'SpaceGrotesk-Bold', letterSpacing: 1.0 },
  title:     { fontSize: 28, lineHeight: 34, fontFamily: 'SpaceGrotesk-Bold', letterSpacing: 0.3 },
  heading:   { fontSize: 22, lineHeight: 28, fontFamily: 'SpaceGrotesk-Bold', letterSpacing: 0.2 },
  body:      { fontSize: 16, lineHeight: 24, fontFamily: 'Inter-Regular',     letterSpacing: 0 },
  bodySmall: { fontSize: 14, lineHeight: 20, fontFamily: 'Inter-Regular',     letterSpacing: 0 },
  label:     { fontSize: 14, lineHeight: 18, fontFamily: 'Inter-Medium',      letterSpacing: 1.2 },
  caption:   { fontSize: 14, lineHeight: 18, fontFamily: 'Inter-Regular',     letterSpacing: 0.5 },
  button:    { fontSize: 17, lineHeight: 22, fontFamily: 'SpaceGrotesk-Bold', letterSpacing: 0.3 },
}

export type ThemeColors = typeof colors.light

export function useThemeColors(): ThemeColors {
  const { resolvedScheme } = useThemeContext()
  return useMemo(() => (resolvedScheme === 'dark' ? colors.dark : colors.light), [resolvedScheme])
}
