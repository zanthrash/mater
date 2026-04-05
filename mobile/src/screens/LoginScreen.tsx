import React, { useState } from 'react'
import { View, Text, StyleSheet, Image, KeyboardAvoidingView, Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useThemeColors, typography } from '../theme'
import { FormInput } from '../components/FormInput'
import { PrimaryButton } from '../components/PrimaryButton'
import { useThemeContext } from '../ThemeContext'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface Props {
  onLogin: (email: string) => Promise<void>
}

export function LoginScreen({ onLogin }: Props) {
  const colors = useThemeColors()
  const { resolvedScheme } = useThemeContext()
  const insets = useSafeAreaInsets()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!EMAIL_REGEX.test(email.trim())) {
      setError('Enter a valid email address')
      return
    }
    setError('')
    setLoading(true)
    try {
      await onLogin(email.trim().toLowerCase())
    } catch (err: any) {
      setError(err?.message ?? 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const logo =
    resolvedScheme === 'dark'
      ? require('../../../assets/img/rb-ai-logo-dark-mode.png')
      : require('../../../assets/img/rb-ai-logo.png')

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 60 }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
        <Image source={logo} style={styles.logo} resizeMode="contain" accessibilityLabel="rb AI logo" />
        <Text style={[typography.title, { color: colors.heading, marginTop: 24, textAlign: 'center' }]}>
          Welcome to Mater
        </Text>
        <Text style={[typography.body, { color: colors.secondary, marginTop: 8, textAlign: 'center' }]}>
          Enter your email to get started
        </Text>

        <View style={styles.form}>
          <FormInput
            label="Email"
            value={email}
            onChangeText={(text) => { setEmail(text); setError('') }}
            placeholder="you@company.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            returnKeyType="go"
            onSubmitEditing={handleSubmit}
          />
          {error ? (
            <Text style={[typography.bodySmall, { color: colors.error, marginTop: 4 }]}>
              {error}
            </Text>
          ) : null}

          <PrimaryButton
            title="Continue"
            onPress={handleSubmit}
            disabled={!email.trim()}
            loading={loading}
            style={{ marginTop: 24 }}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logo: {
    width: 180,
    height: 60,
  },
  form: {
    width: '100%',
    marginTop: 40,
  },
})
