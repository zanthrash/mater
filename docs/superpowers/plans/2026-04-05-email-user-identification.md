# Email-Only User Identification — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add email-only user identification so 10-30 demo testers can be distinguished, assets tracked per user, and a "My Assets" filter shown.

**Architecture:** New `users` table keyed by email. `UserContext` on mobile persists identity in AsyncStorage. Login screen gates the app. Backend upserts user on login, associates assets with user_id.

**Tech Stack:** Fastify 5, Supabase (Postgres), Expo React Native, AsyncStorage, Vitest (backend tests)

**Spec:** `docs/superpowers/specs/2026-04-05-email-user-identification-design.md`

---

## File Map

### Backend — Create
- `backend/supabase/migrations/20260405000000_create_users_table.sql` — users table + assets.user_id column
- `backend/src/repositories/UserRepository.ts` — Supabase CRUD for users
- `backend/src/routes/users.ts` — POST /api/users/login route
- `backend/src/__tests__/UserRepository.test.ts` — repo unit tests
- `backend/src/__tests__/users.route.test.ts` — route tests

### Backend — Modify
- `backend/src/app.ts` — register users route
- `backend/src/routes/assets.ts` — accept user_id on POST, add user_id filter on GET
- `backend/src/repositories/AssetRepository.ts` — add user_id to Asset interface and list filter
- `backend/src/__tests__/assets.route.test.ts` — update existing tests for user_id

### Mobile — Create
- `mobile/src/UserContext.tsx` — user context provider + hook
- `mobile/src/screens/LoginScreen.tsx` — email login screen

### Mobile — Modify
- `mobile/src/App.tsx` — wrap with UserProvider, gate on user, pass user_id to createAsset
- `mobile/src/services/APIClient.ts` — add loginUser method, add user_id to createAsset and listAssets
- `mobile/src/screens/AssetListScreen.tsx` — add "My Assets" / "All Assets" filter toggle

---

## Task 1: Database Migration

**Files:**
- Create: `backend/supabase/migrations/20260405000000_create_users_table.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  display_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS users_email_idx ON users (email);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all_users" ON users
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Add user_id to assets
ALTER TABLE assets ADD COLUMN user_id uuid REFERENCES users(id);
CREATE INDEX IF NOT EXISTS assets_user_id_idx ON assets (user_id);
```

- [ ] **Step 2: Apply migration**

Run: `cd backend && npx supabase db push` (or however the local Supabase migrations are applied — check `package.json` scripts)

- [ ] **Step 3: Commit**

```bash
git add backend/supabase/migrations/20260405000000_create_users_table.sql
git commit -m "feat: add users table and assets.user_id column"
```

---

## Task 2: UserRepository

**Files:**
- Create: `backend/src/repositories/UserRepository.ts`
- Create: `backend/src/__tests__/UserRepository.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// backend/src/__tests__/UserRepository.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UserRepository } from '../repositories/UserRepository.js'

function mockSupabase(resolvedValue: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(resolvedValue),
    upsert: vi.fn().mockReturnThis(),
  }
  return { from: vi.fn().mockReturnValue(chain), chain }
}

describe('UserRepository', () => {
  describe('upsertByEmail', () => {
    it('upserts a user and returns the record', async () => {
      const user = { id: 'u1', email: 'zach@test.com', display_name: 'zach', created_at: '2026-04-05' }
      const { from, chain } = mockSupabase({ data: user, error: null })
      const repo = new UserRepository({ from } as any)

      const result = await repo.upsertByEmail('zach@test.com')

      expect(from).toHaveBeenCalledWith('users')
      expect(chain.upsert).toHaveBeenCalledWith(
        { email: 'zach@test.com', display_name: 'zach' },
        { onConflict: 'email' }
      )
      expect(result).toEqual(user)
    })

    it('derives display_name from email prefix', async () => {
      const user = { id: 'u2', email: 'jane.doe@company.com', display_name: 'jane.doe', created_at: '2026-04-05' }
      const { from, chain } = mockSupabase({ data: user, error: null })
      const repo = new UserRepository({ from } as any)

      await repo.upsertByEmail('jane.doe@company.com')

      expect(chain.upsert).toHaveBeenCalledWith(
        { email: 'jane.doe@company.com', display_name: 'jane.doe' },
        { onConflict: 'email' }
      )
    })

    it('throws on supabase error', async () => {
      const { from } = mockSupabase({ data: null, error: { message: 'db error' } })
      const repo = new UserRepository({ from } as any)

      await expect(repo.upsertByEmail('bad@test.com')).rejects.toThrow('db error')
    })
  })

  describe('findById', () => {
    it('returns user by id', async () => {
      const user = { id: 'u1', email: 'zach@test.com', display_name: 'zach', created_at: '2026-04-05' }
      const { from } = mockSupabase({ data: user, error: null })
      const repo = new UserRepository({ from } as any)

      const result = await repo.findById('u1')
      expect(result).toEqual(user)
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && npx vitest run src/__tests__/UserRepository.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement UserRepository**

```typescript
// backend/src/repositories/UserRepository.ts
import { SupabaseClient } from '@supabase/supabase-js'

export interface User {
  id: string
  email: string
  display_name: string
  created_at: string
}

export class UserRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async upsertByEmail(email: string): Promise<User> {
    const displayName = email.split('@')[0]
    const { data, error } = await this.supabase
      .from('users')
      .upsert({ email, display_name: displayName }, { onConflict: 'email' })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data as User
  }

  async findById(id: string): Promise<User> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw new Error(error.message)
    return data as User
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && npx vitest run src/__tests__/UserRepository.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/repositories/UserRepository.ts backend/src/__tests__/UserRepository.test.ts
git commit -m "feat: add UserRepository with upsert-by-email"
```

---

## Task 3: Users Route

**Files:**
- Create: `backend/src/routes/users.ts`
- Create: `backend/src/__tests__/users.route.test.ts`
- Modify: `backend/src/app.ts`

- [ ] **Step 1: Write failing route tests**

```typescript
// backend/src/__tests__/users.route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'

vi.mock('../repositories/UserRepository.js', () => ({
  UserRepository: vi.fn().mockImplementation(() => ({
    upsertByEmail: vi.fn(),
  })),
}))

import { usersRoute } from '../routes/users.js'
import { UserRepository } from '../repositories/UserRepository.js'

describe('POST /api/users/login', () => {
  let app: ReturnType<typeof Fastify>

  beforeEach(async () => {
    app = Fastify()
    app.register(usersRoute)
    await app.ready()
  })

  afterEach(() => app.close())

  it('returns user on valid email', async () => {
    const user = { id: 'u1', email: 'zach@test.com', display_name: 'zach', created_at: '2026-04-05' }
    const mockRepo = (UserRepository as any).mock.results[0].value
    mockRepo.upsertByEmail.mockResolvedValue(user)

    const res = await app.inject({
      method: 'POST',
      url: '/api/users/login',
      payload: { email: 'zach@test.com' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ user })
  })

  it('returns 400 on missing email', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/users/login',
      payload: {},
    })

    expect(res.statusCode).toBe(400)
  })

  it('returns 400 on invalid email format', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/users/login',
      payload: { email: 'not-an-email' },
    })

    expect(res.statusCode).toBe(400)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && npx vitest run src/__tests__/users.route.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement users route**

```typescript
// backend/src/routes/users.ts
import { FastifyPluginAsync } from 'fastify'
import { createClient } from '@supabase/supabase-js'
import { config } from '../config.js'
import { UserRepository } from '../repositories/UserRepository.js'

interface LoginBody {
  email: string
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const usersRoute: FastifyPluginAsync = async (app) => {
  const supabase = createClient(config.supabaseUrl!, config.supabaseKey!)
  const repo = new UserRepository(supabase)

  app.post<{ Body: LoginBody }>('/api/users/login', {
    schema: {
      body: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const { email } = request.body

    if (!EMAIL_REGEX.test(email)) {
      return reply.status(400).send({ error: 'Invalid email format' })
    }

    try {
      const user = await repo.upsertByEmail(email.toLowerCase().trim())
      return { user }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed'
      return reply.status(500).send({ error: message })
    }
  })
}
```

- [ ] **Step 4: Register route in app.ts**

In `backend/src/app.ts`, add:
```typescript
import { usersRoute } from './routes/users.js'
```
And in `buildApp()`:
```typescript
app.register(usersRoute)
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && npx vitest run src/__tests__/users.route.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src/routes/users.ts backend/src/__tests__/users.route.test.ts backend/src/app.ts
git commit -m "feat: add POST /api/users/login route"
```

---

## Task 4: Modify Assets Route for user_id

**Files:**
- Modify: `backend/src/repositories/AssetRepository.ts` — add `user_id` to `Asset` interface, add filter to `list()`
- Modify: `backend/src/routes/assets.ts` — accept `user_id` in POST body, add `user_id` query param to GET
- Modify: `backend/src/__tests__/assets.route.test.ts` — update tests

- [ ] **Step 1: Update Asset interface in AssetRepository.ts**

Add `user_id` field to the `Asset` interface (after `status` field):
```typescript
user_id: string | null
```

- [ ] **Step 2: Add user_id filter to list method in AssetRepository.ts**

In the `list()` method, after the existing `.neq('status', 'deleted')` filter, add:
```typescript
if (options.userId) {
  query = query.eq('user_id', options.userId)
}
```

And add `userId?: string` to the `ListAssetsOptions` interface.

- [ ] **Step 3: Update POST /api/assets in assets.ts**

Add `userId` to the `PostBody` interface:
```typescript
userId?: string
```

In the POST handler, add `user_id: body.userId ?? null` to the `repo.create()` call object.

Also populate `operator_name` on the `repo.createIntakeEvent()` call — this requires looking up the user. Add before the `createIntakeEvent` call:
```typescript
let operatorName = body.operatorName
if (!operatorName && body.userId) {
  try {
    const userRepo = new UserRepository(supabase)
    const user = await userRepo.findById(body.userId)
    operatorName = user.display_name
  } catch { }
}
```

Add import at top:
```typescript
import { UserRepository } from '../repositories/UserRepository.js'
```

And change the `operator_name` value in `createIntakeEvent` from `body.operatorName ?? null` to `operatorName ?? null`.

- [ ] **Step 4: Add user_id query param to GET /api/assets in assets.ts**

Add `userId` to the `ListQuery` interface:
```typescript
userId?: string
```

In the GET handler, add `userId: query.userId` to the options object passed to `repo.list()`.

Also add `userId` to the JSON schema for the GET route's querystring:
```typescript
userId: { type: 'string' },
```

- [ ] **Step 5: Update existing tests in assets.route.test.ts**

Add `user_id: null` to any mock asset objects that tests compare against. No new test file needed — just ensure existing tests still pass with the new optional field.

- [ ] **Step 6: Run all backend tests**

Run: `cd backend && npx vitest run`
Expected: ALL PASS

- [ ] **Step 7: Commit**

```bash
git add backend/src/repositories/AssetRepository.ts backend/src/routes/assets.ts backend/src/__tests__/assets.route.test.ts
git commit -m "feat: add user_id to asset creation and listing"
```

---

## Task 5: Mobile API Client Updates

**Files:**
- Modify: `mobile/src/services/APIClient.ts`

- [ ] **Step 1: Add User type and loginUser method**

Add the `User` type near the other type definitions:
```typescript
export interface User {
  id: string
  email: string
  display_name: string
  created_at: string
}
```

Add `loginUser` method to the `APIClient` class:
```typescript
async loginUser(email: string): Promise<User> {
  try {
    const { data } = await this.http.post<{ user: User }>('/api/users/login', { email })
    return data.user
  } catch (error) {
    const err = error as import('axios').AxiosError
    const data = err.response?.data as { message?: string; error?: string } | undefined
    const message = data?.message ?? data?.error ?? err.message
    throw { message, source: 'backend' as const } as ServiceError
  }
}
```

- [ ] **Step 2: Add userId to CreateAssetRequest**

Add to the `CreateAssetRequest` interface:
```typescript
userId?: string
```

- [ ] **Step 3: Add userId param to listAssets**

In the `listAssets` method, the `params` object already gets passed as query params. Add `userId` to the params type. Find the existing params type/interface for `listAssets` and add:
```typescript
userId?: string
```

- [ ] **Step 4: Commit**

```bash
git add mobile/src/services/APIClient.ts
git commit -m "feat: add loginUser and userId to API client"
```

---

## Task 6: UserContext Provider

**Files:**
- Create: `mobile/src/UserContext.tsx`

- [ ] **Step 1: Create UserContext following ThemeContext pattern**

```typescript
// mobile/src/UserContext.tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/UserContext.tsx
git commit -m "feat: add UserContext with AsyncStorage persistence"
```

---

## Task 7: Login Screen

**Files:**
- Create: `mobile/src/screens/LoginScreen.tsx`

- [ ] **Step 1: Create LoginScreen component**

```typescript
// mobile/src/screens/LoginScreen.tsx
import React, { useState } from 'react'
import { View, Text, StyleSheet, Image, KeyboardAvoidingView, Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useThemeColors } from '../theme'
import { typography } from '../theme'
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

  const isValid = EMAIL_REGEX.test(email.trim())

  async function handleSubmit() {
    if (!isValid) {
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

  const logo = resolvedScheme === 'dark'
    ? require('../../assets/rb-ai-logo-dark.png')
    : require('../../assets/rb-ai-logo.png')

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 60 }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
        <Image source={logo} style={styles.logo} resizeMode="contain" />
        <Text style={[typography.title, { color: colors.heading, marginTop: 24, textAlign: 'center' }]}>
          ASSET INTAKE
        </Text>
        <Text style={[typography.body, { color: colors.subtext, marginTop: 8, textAlign: 'center' }]}>
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
```

Note: Check actual logo asset filenames and `FormInput` import paths. The logo references (`rb-ai-logo-dark.png`, `rb-ai-logo.png`) and component paths should match what exists in the project — verify at implementation time.

- [ ] **Step 2: Commit**

```bash
git add mobile/src/screens/LoginScreen.tsx
git commit -m "feat: add LoginScreen component"
```

---

## Task 8: Integrate UserContext and LoginScreen into App.tsx

**Files:**
- Modify: `mobile/src/App.tsx`

- [ ] **Step 1: Add UserProvider to provider hierarchy**

Import at top of file:
```typescript
import { UserProvider, useUserContext } from './UserContext'
```

In the `App` component (the root), add `UserProvider` inside `ThemeProvider`:
```tsx
<ThemeProvider>
  <UserProvider>
    <AppShell />
  </UserProvider>
</ThemeProvider>
```

- [ ] **Step 2: Gate AppContent on user state**

Import `LoginScreen`:
```typescript
import { LoginScreen } from './screens/LoginScreen'
```

At the top of `AppContent`, add:
```typescript
const { user, loading: userLoading, login, logout } = useUserContext()
```

Before the existing screen routing (the `if (screen === '...')` chain), add a gate:
```typescript
if (userLoading) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  )
}

if (!user) {
  return <LoginScreen onLogin={login} />
}
```

- [ ] **Step 3: Pass user_id to createAsset**

In the `onSubmit` callback for `ReviewEditScreen` (around line 345), change `operatorName: undefined` to:
```typescript
operatorName: user.display_name,
userId: user.id,
```

- [ ] **Step 4: Add logout button to AssetListScreen props and header**

Pass `onLogout={logout}` and `userName={user.display_name}` as new props to `AssetListScreen`:
```tsx
<AssetListScreen
  assets={assets}
  loading={assetsLoading}
  onNewIntake={() => navigate('overview')}
  onAssetPress={(id) => { setSelectedAssetId(id); navigate('asset-detail') }}
  onSearch={loadAssets}
  onDeleteAsset={handleDelete}
  onLogout={logout}
  userName={user.display_name}
/>
```

- [ ] **Step 5: Commit**

```bash
git add mobile/src/App.tsx
git commit -m "feat: integrate UserContext, gate app on login"
```

---

## Task 9: AssetListScreen — User Display and Filter

**Files:**
- Modify: `mobile/src/screens/AssetListScreen.tsx`

- [ ] **Step 1: Add new props to AssetListScreen**

Add to the `Props` interface:
```typescript
onLogout: () => void
userName: string
```

- [ ] **Step 2: Add user greeting and logout to header**

In the header area (around lines 184-197), add a row below the existing header showing the user name and a logout button. Between the header and search bar:

```tsx
<View style={[styles.userBar, { borderBottomColor: colors.border }]}>
  <Text style={[typography.bodySmall, { color: colors.subtext }]}>
    Logged in as {userName}
  </Text>
  <Pressable onPress={onLogout} hitSlop={12}>
    <Text style={[typography.bodySmall, { color: colors.primary }]}>Log out</Text>
  </Pressable>
</View>
```

Add to `StyleSheet.create()`:
```typescript
userBar: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingHorizontal: 20,
  paddingVertical: 8,
  borderBottomWidth: StyleSheet.hairlineWidth,
},
```

- [ ] **Step 3: Add "My Assets" / "All Assets" filter toggle**

Add state at the top of the component:
```typescript
const [filterMine, setFilterMine] = useState(false)
```

Import `useUserContext`:
```typescript
import { useUserContext } from '../UserContext'
```

Get user in component:
```typescript
const { user } = useUserContext()
```

Add a toggle in the sort bar area (alongside existing sort chips), or just above the FlatList. Add a chip/button:
```tsx
<Pressable
  onPress={() => setFilterMine(!filterMine)}
  style={[
    styles.filterChip,
    { backgroundColor: filterMine ? colors.primary : colors.surface, borderColor: colors.border }
  ]}
  hitSlop={8}
>
  <Text style={[
    typography.bodySmall,
    { color: filterMine ? colors.onPrimary : colors.subtext }
  ]}>
    My Assets
  </Text>
</Pressable>
```

Add to styles:
```typescript
filterChip: {
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 16,
  borderWidth: 1,
  marginLeft: 8,
},
```

- [ ] **Step 4: Filter the displayed assets**

Derive the displayed list from props:
```typescript
const displayedAssets = filterMine && user
  ? assets.filter(a => a.user_id === user.id)
  : assets
```

Use `displayedAssets` instead of `assets` in the `FlatList` data prop and empty state check.

Note: Client-side filtering is sufficient for the POC. For a production app you'd use the `?userId=` server-side filter, but for demo data volumes this is simpler and avoids extra API calls when toggling.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/screens/AssetListScreen.tsx
git commit -m "feat: add user bar, logout, and My Assets filter"
```

---

## Verification

After all tasks are complete:

1. **Fresh launch** — kill app, clear AsyncStorage (`npx expo start --clear`), verify login screen appears
2. **Login** — enter email, tap Continue, verify home screen loads with display name in header
3. **Persist** — kill and reopen app, verify it skips login and goes straight to home
4. **Create asset** — complete an intake, then check the database:
   ```sql
   SELECT id, user_id FROM assets ORDER BY created_at DESC LIMIT 1;
   SELECT operator_name FROM intake_events ORDER BY created_at DESC LIMIT 1;
   ```
   Both should be populated
5. **My Assets filter** — tap "My Assets" chip, verify only current user's assets shown
6. **Second user** — log out, log in with a different email, create an asset, verify "My Assets" shows only the new user's asset
7. **All backend tests pass**: `cd backend && npm test`
