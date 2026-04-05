# Mater

AI-powered heavy equipment asset ingestion — field operators photograph equipment and AI classifies it, extracts specs, and reads VIN/serial numbers.

> **Status:** POC / early development

---

## Overview

Mater is a mobile-first app for auction yards and equipment dealers. A field operator photographs a piece of heavy equipment, walks through a short guided photo checklist, and the app automatically:

- Classifies equipment type (category → type → subtype) using Claude AI
- Extracts core specs (make, model, year, engine type, transmission, GVW, etc.)
- Looks up VIN/serial via NHTSA, falling back to AI interpretation
- Stores the asset record with photos in Supabase

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile | Expo (React Native), TypeScript |
| Backend | Fastify 5, TypeScript, Node.js ≥20 |
| Database | Supabase (PostgreSQL + Storage) |
| AI | Anthropic Claude (`claude-sonnet-4-6`) |
| VIN Lookup | NHTSA vPIC API |
| Testing | Vitest (backend), Jest + jest-expo (mobile) |
| Monorepo | npm workspaces |

---

## Architecture

```
mater/
  mobile/       # Expo RN app (field operator UI)
  backend/      # Fastify API server
  docs/         # PRD, implementation plan, deployment plan
```

### Data Flow

```
Mobile wizard
  → POST /api/analyze/classify     (classifyEquipment — runs early on overview photo)
  → POST /api/analyze/vin          (VIN lookup: NHTSA then Claude fallback)
  → POST /api/analyze/vin-ocr      (optional: extract VIN from photo)
  → POST /api/analyze/images       (analyzeImages — full spec extraction)
  → POST /api/assets               (create asset + upload photos to Supabase Storage)
```

---

## Backend

### API Routes

| Route | Description |
|---|---|
| `GET /health` | Health check |
| `POST /api/analyze/images` | Extract specs from photos via Claude |
| `POST /api/analyze/vin` | Look up VIN/serial (NHTSA + Claude fallback) |
| `POST /api/analyze/vin-ocr` | Extract VIN text from a photo |
| `POST /api/analyze/classify` | Classify equipment type from photo(s) |
| `POST /api/assets` | Create asset record with photos |
| `GET /api/assets` | List assets (filter by category, type, make, status, search) |
| `GET /api/assets/:id` | Get single asset |
| `PUT /api/assets/:id` | Update asset |
| `GET /api/assets/:id/intake-events` | Get intake event history for an asset |
| `GET /api/taxonomy` | Equipment category/type/subtype tree |

### Services

- **ImageAnalysisService** — Claude AI calls for classification, spec extraction, VIN OCR
- **VINLookupService** — NHTSA primary, Claude fallback
- **PhotoStorageService** — uploads base64 images to Supabase Storage (`inspection-photos` bucket)

### Database Tables

| Table | Purpose |
|---|---|
| `assets` | Core asset record (specs, photos, location, status) |
| `intake_events` | Append-only log of each intake operation per asset |
| `taxonomy` | Reference data — ~170 entries across 11 equipment categories |

Migrations live in `backend/supabase/migrations/`.

---

## Mobile

### Intake Wizard (5 steps)

1. **Overview** — capture hero photo; triggers early equipment classification
2. **VIN Entry** — type or photograph VIN/serial number
3. **Guided Photos** — AI-generated checklist of photos specific to the equipment type
4. **Review & Edit** — inspect AI-extracted specs, edit taxonomy, yard metadata (lot, location, consignor)
5. **Submit** — creates the asset record

### Navigation

Custom state-based router in `App.tsx` — no React Navigation navigator components. A `history` stack handles back navigation and clears downstream state on back.

### Other Notable Details

- **Draft persistence** — `WizardStateManager` saves progress to AsyncStorage; users are prompted to resume on relaunch
- **Theme system** — `ThemeContext` with system/light/dark modes, persisted to AsyncStorage, defaults to dark
- **Photo compression** — `PhotoCaptureModule` resizes to 1024px / 80% JPEG before upload
- **API base URL** — hardcoded to `http://192.168.1.23:3000` in `APIClient.ts`; update for your dev machine

---

## Getting Started

### Prerequisites

- Node.js ≥ 20
- A [Supabase](https://supabase.com) project
- An [Anthropic API key](https://console.anthropic.com)
- Expo Go app on a physical device (or iOS Simulator)

### Install

```bash
npm install
```

### Environment

```bash
cp backend/.env.example backend/.env
# Fill in SUPABASE_URL, SUPABASE_SERVICE_KEY, ANTHROPIC_API_KEY
```

Run Supabase migrations against your project:

```bash
# via Supabase CLI or paste migration files into the Supabase SQL editor
# migrations are in backend/supabase/migrations/
```

Update the API base URL in `mobile/src/services/APIClient.ts` to your dev machine's local IP.

### Run

```bash
npm run dev:backend   # Fastify API on port 3000 (hot-reload)
npm run dev:mobile    # Expo dev server
```

### Test

```bash
npm test              # all tests
npm run test:backend  # vitest (backend only)
npm run test:mobile   # jest-expo (mobile only)
```

---

## Project Structure

```
mater/
  mobile/
    src/
      App.tsx                     # Root component + state-based router
      screens/                    # AssetList, AssetDetail, Overview, VINEntry, GuidedPhotos, ReviewEdit, Submit
      components/                 # Shared UI (WizardProgress, CameraViewfinder, etc.)
      services/APIClient.ts       # Axios-based API client
      state/WizardStateManager.ts # Draft persistence (AsyncStorage)
      modules/PhotoCaptureModule.ts
      theme.ts                    # Color palette + typography
      ThemeContext.tsx             # Theme provider
  backend/
    src/
      index.ts                    # Entrypoint (Fastify server)
      app.ts                      # buildApp() — registers routes
      config.ts                   # Env var validation
      routes/                     # analyze, assets, taxonomy, health
      services/                   # ImageAnalysisService, VINLookupService, PhotoStorageService
      repositories/               # AssetRepository, TaxonomyRepository
    supabase/migrations/          # SQL migrations
  docs/
    prd.md                        # Product requirements
    plan.md                       # Implementation plan
    deployment-plan.md            # Fly.io + EAS/TestFlight deployment guide
```

---

## Docs

See the `docs/` folder for the full PRD, architecture/implementation plan, and deployment guide (Fly.io for backend, EAS + TestFlight for mobile).
