# Mater Dashboard — Design Spec

## Context

Mater is an AI-powered heavy equipment asset intake system. Field operators use a mobile app to photograph equipment, capture VINs, and submit assets through a 6-step wizard. Claude AI classifies equipment, extracts specs, and reads VIN/serial numbers. All data is stored in Supabase (Postgres + Storage).

There is currently no way to monitor intake activity across operators, triage data quality issues, or analyze AI performance from a desktop. This spec defines a new **dashboard web application** — the third app in the monorepo — that provides a command-center view of the entire intake operation.

**Primary user:** Blended yard manager / back-office admin at a small operation who both oversees field operators and processes intake data downstream.

## Tech Stack

- **Framework:** React + Vite + TanStack Router (type-safe file-based routing)
- **UI:** Tailwind CSS + shadcn/ui components
- **Charts:** Recharts
- **Data fetching:** TanStack Query (polling-based, WebSocket-ready architecture)
- **Monorepo location:** `dashboard/` alongside `mobile/` and `backend/`

## Architecture

API-Only — the dashboard hits the existing Fastify backend exclusively. No direct Supabase access from the browser.

```
┌─────────────┐    ┌─────────────┐
│  Mobile App  │    │  Dashboard   │
│  (Expo RN)   │    │  (React+Vite)│
└──────┬───────┘    └──────┬───────┘
       │  REST             │  REST
       └────────┬──────────┘
                │
        ┌───────┴────────┐
        │ Fastify Backend │
        │ (existing +     │
        │  new routes)    │
        └───────┬────────┘
                │
        ┌───────┴────────┐
        │    Supabase     │
        │ Postgres+Storage│
        └────────────────┘
```

**Data refresh:** TanStack Query polling at 30-60s intervals. Architecture supports swapping to WebSocket push later without rewriting components.

**CORS:** Add dashboard origin to Fastify's `@fastify/cors` allowlist. No architectural changes needed.

**"Active" operator definition:** An operator is considered "active" if they have submitted an intake within the last 30 minutes. "Idle" shows time since their last intake. This is derived from `intake_events.created_at` — no heartbeat or presence system needed for V1.

## Asset Status Workflow

Extends the current free-text `status` column on `assets` with a triage-oriented workflow:

```
intake → needs_review → reviewed → approved
                                      ↓
                                   deleted (soft)
```

- **intake** — freshly submitted from mobile (current default)
- **needs_review** — flagged automatically (low AI confidence, missing required fields) or manually from dashboard
- **reviewed** — someone examined and corrected issues
- **approved** — verified and ready for downstream use

Auto-flagging rules (backend):
- AI classification confidence < 70% → auto `needs_review`
- Missing make, model, or year after AI extraction → auto `needs_review`
- These run at asset creation time in the existing `POST /api/assets` handler

## Layout

**Sidebar + Activity Stream** (Layout C):
- **Left:** 56px icon sidebar for navigation (Dashboard, Assets, Operators, AI Insights, Settings)
- **Center:** Main content area — scrollable, changes per view
- **Right:** 220px collapsible activity stream — persistent on dashboard home, collapsed to 36px icon on detail/focused views

## Views

### 1. Command Center (Dashboard Home)

The landing page. Route: `/`

**KPI Strip** (4 cards, top):
- Today's Intakes — count + delta vs yesterday
- Active Operators — active/total + idle count
- Needs Review — count + breakdown (low confidence vs missing fields). Visually highlighted with amber gradient border as primary action trigger.
- Avg AI Confidence — percentage across today's intakes

**Main Content Grid:**
- **Intake Volume Chart** (left, 2/3 width) — bar chart, toggleable: Today (hourly) / Week (daily) / Month (weekly)
- **Recent Intakes Table** (left, below chart) — last ~10 intakes with columns: Time, Asset (make+model), Operator, Category (color badge), AI Confidence (color-coded: green ≥80%, yellow ≥50%, red <50%), Status (badge). Click row → asset detail.
- **Category Breakdown** (right, 1/3 width) — horizontal bar chart showing intake count per category
- **Top Operators Mini** (right, below categories) — top 3-5 operators with intake count, avg confidence, active/idle status. "View all →" link to operators page.

**Activity Stream** (right panel, expanded):
- Real-time feed of intake events, color-coded by type:
  - Blue: successful submission
  - Amber: low-confidence flagged submission
  - Red: very low confidence (<50%)
  - Purple: operator currently in-progress (shows wizard step + progress bar)
- Each card shows: operator name, asset name, timestamp, confidence, photo thumbnails
- Grouped by time: "Just Now", "Earlier"

### 2. Asset Inventory Table

Full searchable/filterable/sortable table. Route: `/assets`

**Filters:**
- Status (intake / needs_review / reviewed / approved) — tab bar or multi-select
- Category — dropdown from taxonomy
- Type — cascading dropdown
- Make — searchable dropdown
- Operator — dropdown
- Date range — date picker
- Free text search — searches VIN, make, model, lot number

**Table columns:** Thumbnail (first photo), Make+Model, Year, Category, Type, VIN/Serial, Operator, AI Confidence, Status, Created At

**Features:**
- Sortable by any column
- Bulk status updates (select multiple → "Mark as Reviewed", "Approve All")
- Click row → asset detail view
- Pagination with configurable page size

### 3. Asset Detail

Deep dive into a single asset. Route: `/assets/:id`

**Header bar:** Breadcrumb (← Assets / Asset Name), status badge, action buttons:
- "Flag for Review" — sets status to `needs_review`
- "Edit Asset" — opens inline edit mode
- "Approve ✓" — sets status to `approved`

**Left column (3/5 width):**
- **Photo Gallery** — hero photo large, thumbnail grid for guided photos. Click to enlarge/lightbox. Labels shown on each.
- **Core Specs** — 3-column grid (Make, Model, Year, Engine, GVW, Hours). AI confidence badge.
- **Type-Specific Specs** — 2-column grid of dynamic key-value pairs from `type_specific_specs` JSONB.

**Right column (2/5 width):**
- **Classification** — category → type → subtype breadcrumb with confidence bar
- **Identification** — VIN/serial number, source (OCR/manual), NHTSA verification status, conflict indicator
- **Yard Info** — lot number, yard location, consignor
- **Intake Timeline** — chronological audit trail from `intake_events`: who submitted, when, GPS coordinates, AI classification result, VIN lookup result. Vertical timeline with colored dots.

**Edit mode:** Inline editing of all fields. Same fields as mobile ReviewEditScreen. Save triggers `PUT /api/assets/:id`.

**Activity stream:** Collapsed to icon on this view for more content space.

### 4. Operator Leaderboard

Per-operator performance. Route: `/operators`

**Time period toggles:** Today / This Week / This Month / All Time

**Summary KPIs:** Total Intakes, Avg per Operator, Avg Confidence, Review Rate (flagged/total)

**Operator Cards** (one per operator, ranked by intake count):
- Avatar (initials + color), name, email, active/idle status with time
- Stats inline: intake count, avg confidence, flagged count
- Volume bar showing proportion of total intakes
- Rank badge (#1 gets gold)
- **Problem callout:** operators with >40% flag rate get red-tinted card + "High flag rate" badge
- Click card → filtered asset table showing that operator's intakes

**Activity stream:** Expanded on this view (contextual — shows operator activity)

### 5. AI Insights

Aggregate AI performance analytics. Route: `/ai-insights`

**Time period toggles:** Today / This Week / This Month

**KPI Row:**
- Avg Classification Confidence — with delta vs previous period
- Avg Spec Extraction Confidence — with delta
- Override Rate — % of classifications where user changed AI's taxonomy pick
- VIN Match Rate — % where AI specs agree with NHTSA VIN lookup

**Charts & Analysis:**
- **Confidence Trend** (line chart) — classification vs spec extraction confidence over time. Two lines, daily granularity.
- **Confidence Distribution** (histogram) — 5 buckets (0-20, 20-40, 40-60, 60-80, 80-100). Color-coded red/amber/green. Shows if distribution is healthy or bimodal.
- **Common Misclassifications** (table) — top misclassification pairs, derived by comparing `intake_events.ai_taxonomy_result` vs final `assets.category/type/subtype`. Shows count + "AI said X → was actually Y".
- **Accuracy by Category** (horizontal bars) — per-category confidence average. Highlights weak categories (Forestry, Aerial) vs strong (Earthmoving, Trucking).
- **AI vs VIN Agreement** (per-field bars) — match rate for make, model, year, engine type, GVW between AI extraction and VIN lookup.
- **VIN Source Breakdown** (stacked bar) — NHTSA primary vs Claude fallback vs no VIN.

## New Backend Endpoints

The dashboard needs aggregate data the current API doesn't provide. New routes under `/api/dashboard/`:

### `GET /api/dashboard/stats`
Returns KPI data for the command center.

Query params: `period` (today | week | month)

Response:
```json
{
  "intakeCount": 47,
  "intakeCountPrevious": 42,
  "activeOperators": 5,
  "totalOperators": 8,
  "needsReviewCount": 12,
  "needsReviewBreakdown": { "lowConfidence": 4, "missingFields": 8 },
  "avgConfidence": 0.84
}
```

### `GET /api/dashboard/intake-volume`
Returns intake counts bucketed by time.

Query params: `period` (today | week | month)

Response: `{ buckets: [{ label: "Mon", count: 32 }, ...] }`

### `GET /api/dashboard/category-breakdown`
Returns intake counts per category.

Query params: `period` (today | week | month)

Response: `{ categories: [{ category: "Earthmoving", count: 18 }, ...] }`

### `GET /api/dashboard/operators`
Returns per-operator stats.

Query params: `period` (today | week | month)

Response:
```json
{
  "operators": [{
    "id": "uuid",
    "displayName": "Mike Sanders",
    "email": "mike@example.com",
    "intakeCount": 14,
    "avgConfidence": 0.89,
    "flaggedCount": 1,
    "lastIntakeAt": "2026-04-06T14:34:00Z",
    "isActive": true
  }]
}
```

### `GET /api/dashboard/ai-insights`
Returns aggregate AI performance metrics.

Query params: `period` (today | week | month)

Response:
```json
{
  "avgClassificationConfidence": 0.84,
  "avgSpecConfidence": 0.79,
  "overrideRate": 0.18,
  "vinMatchRate": 0.92,
  "confidenceTrend": [{ "date": "2026-03-31", "classification": 0.81, "spec": 0.80 }],
  "confidenceDistribution": [{ "bucket": "80-100", "count": 155 }],
  "misclassifications": [{ "aiCategory": "Backhoe Loader", "actualCategory": "Loader Backhoe", "count": 12 }],
  "categoryAccuracy": [{ "category": "Earthmoving", "avgConfidence": 0.91 }],
  "vinAgreement": { "make": 0.96, "model": 0.91, "year": 0.94, "engineType": 0.78, "gvw": 0.73 },
  "vinSources": { "nhtsa": 0.74, "claude": 0.18, "none": 0.08 }
}
```

### `GET /api/dashboard/activity`
Returns recent intake events for the activity stream.

Query params: `limit` (default 20), `since` (ISO timestamp for polling)

Response:
```json
{
  "events": [{
    "id": "uuid",
    "type": "submission",
    "operatorName": "Mike S.",
    "assetId": "uuid",
    "assetName": "CAT 320F Excavator",
    "category": "Earthmoving",
    "confidence": 0.92,
    "status": "intake",
    "createdAt": "2026-04-06T14:34:00Z",
    "photoCount": 7
  }]
}
```

## Database Changes

### Migration: Add status workflow support

```sql
-- Update existing assets with 'intake' status (some may have 'ingested')
UPDATE assets SET status = 'intake' WHERE status = 'ingested';
```

No schema changes needed — `status` is already a free-text column. The new statuses are enforced at the application level.

### Migration: Add indexes for dashboard queries

```sql
-- Composite index for time-range + status queries
CREATE INDEX idx_assets_created_status ON assets (created_at DESC, status);

-- Index for operator aggregate queries
CREATE INDEX idx_assets_user_created ON assets (user_id, created_at DESC);

-- Index for confidence queries (extracted from intake_events JSONB)
CREATE INDEX idx_intake_events_created ON intake_events (created_at DESC);
```

## Auto-Flagging Logic

Added to `POST /api/assets` handler after asset creation:

```
if classificationConfidence < 0.70:
  set status = 'needs_review'
if make is null OR model is null OR year is null:
  set status = 'needs_review'
```

## Theme

Dark mode, matching mobile app palette:
- Background: `#0F172A` (sidebar, activity stream) / `#1E293B` (cards)
- Text: `#F1F5F9` (primary), `#94A3B8` (secondary), `#64748B` (muted)
- Accent: `#3B82F6` (blue), `#10B981` (green/success), `#F59E0B` (amber/warning), `#EF4444` (red/error), `#8B5CF6` (purple/AI)
- Font: System font stack (Inter if available — matching mobile body font)
- Border radius: 10px cards, 6px buttons, 4px badges

## Not In Scope (V1)

- WebSocket / real-time push (polling first, architecture supports adding later)
- Authentication / authorization (matches current mobile app — email-only, no roles)
- Export / PDF generation
- Mobile-responsive layout (desktop-first, laptop minimum)
- Shared type package between apps (continue duplicating for now)
- GPS map view of intake locations
- Notification system (email/push alerts)

## Mockups

Visual mockups created during brainstorming are available at:
`.superpowers/brainstorm/84322-1775512067/content/`

- `dashboard-home.html` — Command Center landing page
- `asset-detail.html` — Asset Detail view
- `operator-leaderboard.html` — Operator Leaderboard
- `ai-insights.html` — AI Insights page
