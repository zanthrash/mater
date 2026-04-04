import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useColorScheme } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

type ThemeMode = 'system' | 'light' | 'dark'

interface ThemeContextValue {
  mode: ThemeMode
  resolvedScheme: 'light' | 'dark'
  setMode: (mode: ThemeMode) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'system',
  resolvedScheme: 'light',
  setMode: () => {},
})

const STORAGE_KEY = '@theme_mode'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme()
  const [mode, setModeState] = useState<ThemeMode>('dark')

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setModeState(stored)
      }
    })
  }, [])

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next)
    AsyncStorage.setItem(STORAGE_KEY, next)
  }, [])

  const resolvedScheme: 'light' | 'dark' =
    mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode

  return (
    <ThemeContext.Provider value={{ mode, resolvedScheme, setMode }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useThemeContext() {
  return useContext(ThemeContext)
}
