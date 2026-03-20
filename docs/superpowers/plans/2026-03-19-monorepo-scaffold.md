# Monorepo Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bootstrap the `mater` monorepo with working `mobile/` (Expo React Native) and `backend/` (Fastify + TypeScript) workspaces, each with passing smoke tests and Supabase CLI initialized.

**Architecture:** Minimal npm workspaces — two independent workspaces sharing no runtime code. Backend exports a `buildApp()` factory (testable via Fastify inject) and a separate entry point that starts the server. Mobile has an Expo entry shim + App component so the component is importable in Jest without side effects.

**Tech Stack:** npm workspaces, Fastify 5, TypeScript (NodeNext), Vitest, Expo SDK 52, jest-expo, @testing-library/react-native, Supabase CLI

---

## File Map

### Root
- Create: `package.json` — workspaces declaration + convenience scripts
- Create: `.gitignore` — covers both workspaces + Supabase temp files
- Create: `.prettierrc` — shared formatting rules

### Backend
- Create: `backend/package.json` — deps, scripts
- Create: `backend/tsconfig.json` — strict, NodeNext, ESM
- Create: `backend/.eslintrc.json` — @typescript-eslint rules
- Create: `backend/vitest.config.ts` — globals: true
- Create: `backend/.env.example` — documents all required env vars
- Create: `backend/src/app.ts` — `buildApp()` factory, imported by tests
- Create: `backend/src/index.ts` — entry point, imports `buildApp()` and starts server
- Create: `backend/src/routes/health.ts` — `GET /health` plugin
- Create: `backend/src/routes/health.test.ts` — Vitest smoke test

### Mobile
- Create: `mobile/package.json` — Expo deps, scripts
- Create: `mobile/tsconfig.json` — extends expo/tsconfig.base, strict
- Create: `mobile/.eslintrc.json` — eslint-config-expo
- Create: `mobile/jest.config.js` — jest-expo preset + transformIgnorePatterns
- Create: `mobile/app.json` — Expo config
- Create: `mobile/src/App.tsx` — Hello World component
- Create: `mobile/src/index.tsx` — Expo entry shim (registerRootComponent)
- Create: `mobile/src/__tests__/App.test.tsx` — Jest smoke test

### Supabase
- Create: `backend/supabase/` — via `supabase init` run inside `backend/`

---

## Task 1: Root scaffold

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `.prettierrc`

- [ ] **Step 1: Create root `package.json`**

```json
{
  "name": "mater",
  "version": "0.1.0",
  "private": true,
  "workspaces": [
    "mobile",
    "backend"
  ],
  "scripts": {
    "dev:backend": "npm run dev --workspace=backend",
    "dev:mobile": "npm run start --workspace=mobile",
    "test:backend": "npm run test --workspace=backend",
    "test:mobile": "npm run test --workspace=mobile",
    "test": "npm run test:backend && npm run test:mobile"
  }
}
```

- [ ] **Step 2: Create `.gitignore`**

```
# Dependencies
node_modules/

# Build output
dist/
build/

# Environment
.env
.env.local

# OS
.DS_Store

# Expo
.expo/
mobile/.expo/
mobile/ios/
mobile/android/

# Supabase
backend/supabase/.temp/
```

- [ ] **Step 3: Create `.prettierrc`**

```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100,
  "tabWidth": 2
}
```

- [ ] **Step 4: Commit**

```bash
git add package.json .gitignore .prettierrc
git commit -m "feat: add root npm workspaces scaffold"
```

---

## Task 2: Backend tooling config

**Files:**
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/.eslintrc.json`
- Create: `backend/vitest.config.ts`
- Create: `backend/.env.example`

- [ ] **Step 1: Create `backend/package.json`**

```json
{
  "name": "mater-backend",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "test": "vitest run"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.39.0",
    "@fastify/cors": "^9.0.0",
    "@supabase/supabase-js": "^2.49.0",
    "axios": "^1.7.0",
    "fastify": "^5.0.0",
    "pdfkit": "^0.15.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/pdfkit": "^0.13.0",
    "@typescript-eslint/eslint-plugin": "^8.0.0",
    "@typescript-eslint/parser": "^8.0.0",
    "eslint": "^9.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 2: Create `backend/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "outDir": "dist",
    "rootDir": "src",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create `backend/.eslintrc.json`**

```json
{
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "env": {
    "node": true,
    "es2022": true
  }
}
```

- [ ] **Step 4: Create `backend/vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
  },
})
```

- [ ] **Step 5: Create `backend/.env.example`**

```
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Server
PORT=3000
```

- [ ] **Step 6: Commit**

```bash
git add backend/
git commit -m "feat: add backend tooling config (tsconfig, vitest, eslint, env.example)"
```

---

## Task 3: Backend health route (TDD)

**Files:**
- Create: `backend/src/routes/health.ts`
- Create: `backend/src/app.ts`
- Create: `backend/src/index.ts`
- Test: `backend/src/routes/health.test.ts`

- [ ] **Step 1: Write the failing test**

Create `backend/src/routes/health.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { buildApp } from '../app.js'

describe('GET /health', () => {
  it('returns { status: "ok" } with 200', async () => {
    const app = buildApp()
    const response = await app.inject({ method: 'GET', url: '/health' })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ status: 'ok' })
  })
})
```

- [ ] **Step 2: Install dependencies (first time)**

```bash
npm install
```

Run from the repo root. This installs all workspace dependencies before we run tests for the first time.

- [ ] **Step 3: Run the test — verify it fails**

```bash
cd backend && npm test
```

Expected: FAIL — `Cannot find module '../app.js'`

- [ ] **Step 4: Create the health route plugin**

Create `backend/src/routes/health.ts`:

```typescript
import type { FastifyPluginAsync } from 'fastify'

export const healthRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health', async () => {
    return { status: 'ok' }
  })
}
```

- [ ] **Step 5: Create the app factory**

Create `backend/src/app.ts`:

```typescript
import Fastify from 'fastify'
import cors from '@fastify/cors'
import { healthRoute } from './routes/health.js'

export function buildApp({ logger = false }: { logger?: boolean } = {}) {
  const app = Fastify({ logger })
  app.register(cors)
  app.register(healthRoute)
  return app
}
```

The `logger` option defaults to `false` (clean test output). `index.ts` passes `logger: true` for production.

- [ ] **Step 6: Create the server entry point**

Create `backend/src/index.ts`:

```typescript
import { buildApp } from './app.js'

const app = buildApp({ logger: true })
const port = Number(process.env.PORT) || 3000

app.listen({ port, host: '0.0.0.0' }, (err) => {
  if (err) {
    app.log.error(err)
    process.exit(1)
  }
})
```

- [ ] **Step 7: Run the test — verify it passes**

```bash
cd backend && npm test
```

Expected: PASS — `GET /health returns { status: "ok" } with 200`

- [ ] **Step 8: Verify TypeScript compiles**

```bash
cd backend && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 9: Commit**

```bash
git add backend/src/
git commit -m "feat: add Fastify app with GET /health route (tested)"
```

---

## Task 4: Mobile tooling config

**Files:**
- Create: `mobile/package.json`
- Create: `mobile/tsconfig.json`
- Create: `mobile/.eslintrc.json`
- Create: `mobile/jest.config.js`
- Create: `mobile/app.json`

- [ ] **Step 1: Create `mobile/package.json`**

```json
{
  "name": "mater-mobile",
  "version": "0.1.0",
  "main": "src/index.tsx",
  "scripts": {
    "start": "expo start",
    "ios": "expo run:ios",
    "android": "expo run:android",
    "test": "jest"
  },
  "dependencies": {
    "@react-native-async-storage/async-storage": "^2.1.0",
    "@react-navigation/native": "^7.0.0",
    "@react-navigation/stack": "^7.0.0",
    "axios": "^1.7.0",
    "expo": "~52.0.0",
    "expo-camera": "~16.0.0",
    "expo-image-manipulator": "~13.0.0",
    "expo-location": "~18.0.0",
    "react": "18.3.1",
    "react-native": "0.76.6",
    "react-native-gesture-handler": "~2.20.0",
    "react-native-safe-area-context": "^4.12.0",
    "react-native-screens": "~4.4.0"
  },
  "devDependencies": {
    "@testing-library/react-native": "^13.0.0",
    "@types/react": "~18.3.0",
    "eslint": "^8.57.0",
    "eslint-config-expo": "^8.0.0",
    "jest-expo": "~52.0.0",
    "typescript": "^5.3.0"
  }
}
```

- [ ] **Step 2: Create `mobile/tsconfig.json`**

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true
  }
}
```

- [ ] **Step 3: Create `mobile/.eslintrc.json`**

```json
{
  "extends": "expo",
  "rules": {}
}
```

- [ ] **Step 4: Create `mobile/jest.config.js`**

```javascript
module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
}
```

The `transformIgnorePatterns` is critical — Expo packages ship as ESM and must be transpiled by Jest. Without this, tests fail with "unexpected token" errors.

- [ ] **Step 5: Create `mobile/app.json`**

```json
{
  "expo": {
    "name": "mater",
    "slug": "mater",
    "version": "1.0.0",
    "orientation": "portrait",
    "ios": {
      "supportsTablet": true
    },
    "android": {
      "adaptiveIcon": {
        "backgroundColor": "#ffffff"
      }
    }
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add mobile/package.json mobile/tsconfig.json mobile/.eslintrc.json mobile/jest.config.js mobile/app.json
git commit -m "feat: add mobile tooling config (Expo SDK 52, jest-expo, eslint)"
```

---

## Task 5: Mobile App component (TDD)

**Files:**
- Create: `mobile/src/App.tsx`
- Create: `mobile/src/index.tsx`
- Test: `mobile/src/__tests__/App.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `mobile/src/__tests__/App.test.tsx`:

```tsx
import React from 'react'
import { render } from '@testing-library/react-native'
import App from '../App'

it('renders Hello World', () => {
  const { getByText } = render(<App />)
  expect(getByText('Hello World')).toBeTruthy()
})
```

- [ ] **Step 2: Run the test — verify it fails**

```bash
cd mobile && npm test
```

Expected: FAIL — `Cannot find module '../App'`

- [ ] **Step 3: Create the App component**

Create `mobile/src/App.tsx`:

```tsx
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

export default function App() {
  return (
    <View style={styles.container}>
      <Text>Hello World</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
```

- [ ] **Step 4: Create the Expo entry shim**

Create `mobile/src/index.tsx`:

```tsx
import { registerRootComponent } from 'expo'
import App from './App'

registerRootComponent(App)
```

This file is the `"main"` entry in `package.json`. It registers the component with React Native's AppRegistry. The test imports `App` directly, bypassing this file, which avoids side effects in tests.

- [ ] **Step 5: Run the test — verify it passes**

```bash
cd mobile && npm test
```

Expected: PASS — `renders Hello World`

- [ ] **Step 6: Commit**

```bash
git add mobile/src/
git commit -m "feat: add mobile App component with Hello World (tested)"
```

---

## Task 6: Supabase CLI init

**Files:**
- Create: `backend/supabase/` (via CLI)

**Prerequisite:** Docker Desktop must be running before `supabase start`. Start it from your Applications folder if it isn't already.

- [ ] **Step 1: Verify Supabase CLI is installed**

```bash
supabase --version
```

Expected: prints version (e.g. `1.x.x`). If not installed:

```bash
brew install supabase/tap/supabase
```

- [ ] **Step 2: Initialize Supabase inside the backend workspace**

```bash
cd backend && supabase init
```

Expected: creates `backend/supabase/` with `config.toml` and `migrations/` directory.

- [ ] **Step 3: Verify the migrations directory exists**

```bash
ls backend/supabase/migrations
```

Expected: empty directory (no migrations yet — those come in issue #3).

- [ ] **Step 4: Start the local Supabase instance to verify it works**

```bash
cd backend && supabase start
```

Expected: prints local API URL, anon key, service role key. This confirms the local stack is functional.

Stop it after verifying:

```bash
cd backend && supabase stop
```

- [ ] **Step 5: Commit**

```bash
git add backend/supabase/
git commit -m "feat: initialize Supabase CLI in backend workspace"
```

---

## Task 7: Root install + final validation

**Files:** none new

- [ ] **Step 1: Run full test suite**

```bash
npm test
```

Expected:
- Backend: PASS `GET /health returns { status: "ok" } with 200`
- Mobile: PASS `renders Hello World`

Both suites must pass. If either fails, do not proceed — fix the issue first.

- [ ] **Step 2: Verify backend TypeScript**

```bash
cd backend && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Verify backend dev server starts**

```bash
cd backend && npm run dev
```

Expected: Fastify starts and logs that it's listening. In a separate terminal, test it:

```bash
curl http://localhost:3000/health
```

Expected: `{"status":"ok"}`

Stop the server with Ctrl+C.

- [ ] **Step 4: Commit final state**

```bash
git add .
git commit -m "feat: complete monorepo scaffold — backend + mobile running, tests passing"
```

---

## Done

All acceptance criteria from the spec are now met:

1. ✅ `npm install` from root installs both workspaces cleanly
2. ✅ `npm run dev:backend` → `GET /health` returns `{ "status": "ok" }`
3. ✅ `npm run dev:mobile` → Expo dev server starts, app shows Hello World
4. ✅ `supabase start` brings up local Supabase instance
5. ✅ `npm test` runs both suites, both pass with smoke tests
6. ✅ `tsc --noEmit` passes in `backend/`
7. ✅ `.env.example` documents all required env vars

Next: issue #3 (Supabase schema + InspectionRepository) and issues #5, #6, #9, #10, #11 can all be started in parallel once this is merged.
