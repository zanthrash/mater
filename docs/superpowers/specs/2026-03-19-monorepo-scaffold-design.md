# Monorepo Scaffold Design

**Issue:** #2
**Date:** 2026-03-19
**Status:** Approved

## Overview

Bootstrap the `mater` monorepo with a working `mobile/` (Expo React Native) and `backend/` (Fastify + TypeScript) workspace. Both workspaces run locally, respond to a health check or render a Hello World, and have passing smoke tests. Supabase CLI is initialized and ready for migrations. This is the foundation that all other issues depend on.

## Approach

Minimal root: npm workspaces with independent configs per workspace. No shared config package — mobile and backend have different ESLint environments and no shared runtime code. The two workspaces communicate through the API, not shared modules.

## Directory Structure

```
mater/
├── package.json              # root — workspaces: ["mobile", "backend"]
├── .gitignore                # covers both workspaces
├── .prettierrc               # shared formatting rules
├── docs/
│   ├── plan.md
│   ├── prd.md
│   └── superpowers/
│       └── specs/
│           └── 2026-03-19-monorepo-scaffold-design.md
│
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── .eslintrc.json
│   ├── vitest.config.ts
│   ├── .env.example
│   ├── src/
│   │   ├── index.ts          # Fastify app bootstrap + route registration
│   │   └── routes/
│   │       └── health.ts     # GET /health → { status: "ok" }
│   └── supabase/
│       └── migrations/       # placeholder for issue #3
│
└── mobile/
    ├── package.json
    ├── tsconfig.json         # extends expo/tsconfig.base
    ├── .eslintrc.json
    ├── jest.config.js        # jest-expo preset
    ├── app.json              # Expo config
    └── src/
        └── App.tsx           # root component — "Hello World"
```

## Backend

**Stack:** Fastify, TypeScript, Vitest, tsx (dev), tsc (build)

**Key dependencies:**
- Runtime: `fastify`, `@fastify/cors`, `@anthropic-ai/sdk`, `@supabase/supabase-js`, `pdfkit`, `axios`
- Dev: `typescript`, `tsx`, `vitest`, `@types/node`, `eslint`, `@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin`

**TypeScript config:**
- `strict: true`
- `target: "ESNext"`
- `module: "NodeNext"`
- `moduleResolution: "NodeNext"`

**Scripts:**
- `dev`: `tsx watch src/index.ts`
- `build`: `tsc`
- `test`: `vitest run`

**Environment variables** (documented in `.env.example`, gitignored `.env` for local use):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `ANTHROPIC_API_KEY`
- `PORT` (default 3000)

No real service connections in this issue — env vars are documented but not wired to service calls.

## Mobile

**Stack:** Expo SDK 52, React Native, Jest + jest-expo

**Key dependencies:**
- Runtime: `expo`, `react-native`, `@react-navigation/native`, `@react-navigation/stack`, `expo-camera`, `expo-location`, `@react-native-async-storage/async-storage`, `axios`, `expo-image-manipulator`
- Dev: `typescript`, `jest-expo`, `@types/react`, `eslint`, `eslint-config-expo`

**Scripts:**
- `start`: `expo start`
- `ios`: `expo run:ios`
- `android`: `expo run:android`
- `test`: `jest`

## Root

**`package.json` workspaces:** `["mobile", "backend"]`

**Root scripts:**
- `dev:backend` — starts backend dev server
- `dev:mobile` — starts Expo dev server
- `test:backend` — runs Vitest in backend workspace
- `test:mobile` — runs Jest in mobile workspace
- `test` — runs both

## Supabase

`supabase init` run inside `backend/`, creating `backend/supabase/` with a `migrations/` directory ready for issue #3. Local Supabase starts via `supabase start` from within `backend/`.

## Acceptance Criteria

1. `npm install` from root installs both workspaces cleanly
2. `npm run dev:backend` starts Fastify; `GET /health` returns `{ "status": "ok" }`
3. `npm run dev:mobile` launches Expo dev server; app renders "Hello World" on simulator
4. `supabase start` brings up the local Supabase instance
5. `npm test` runs both test suites; each has one passing smoke test confirming the runner works
6. `tsc --noEmit` in `backend/` passes with no errors
7. `.env.example` documents all required env vars

## Out of Scope

- Real service connections (Supabase, Claude API) — wired in later issues
- CI/CD — out of scope for POC per PRD
- Navigation screens, business logic modules — handled in their respective issues
