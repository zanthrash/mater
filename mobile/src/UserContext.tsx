import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { APIClient, User } from './services/APIClient'

const STORAGE_KEY = '@user_email'
const client = new APIClient()

interface UserContextValue {
  user: User | null
  loading: boolean
  login: (email: string) => Promise<void>
  logout: () => Promise<void>
}

const UserContext = createContext<UserContextValue>({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
})

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const storedEmail = await AsyncStorage.getItem(STORAGE_KEY)
        if (storedEmail) {
          const u = await client.loginUser(storedEmail)
          setUser(u)
        }
      } catch {
        await AsyncStorage.removeItem(STORAGE_KEY)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const login = useCallback(async (email: string) => {
    const u = await client.loginUser(email)
    await AsyncStorage.setItem(STORAGE_KEY, email)
    setUser(u)
  }, [])

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY)
    setUser(null)
  }, [])

  return (
    <UserContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUserContext() {
  return useContext(UserContext)
}
