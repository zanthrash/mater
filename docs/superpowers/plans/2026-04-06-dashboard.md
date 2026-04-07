# Mater Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a desktop dashboard web app for monitoring asset intake activity, triaging data quality, and analyzing AI performance across operators.

**Architecture:** New `dashboard/` Vite + React app in the monorepo. Hits the existing Fastify backend via REST (new `/api/dashboard/*` aggregate endpoints). Polling with TanStack Query, WebSocket-ready.

**Tech Stack:** React 19, Vite, TanStack Router, TanStack Query, Tailwind CSS, shadcn/ui, Recharts, Vitest

**Spec:** `docs/superpowers/specs/2026-04-06-dashboard-design.md`

---

## File Structure

### Backend (modifications + new files)

```
backend/
  supabase/migrations/
    20260406000000_dashboard_indexes.sql          # NEW - indexes + status normalization
  src/
    app.ts                                         # MODIFY - register dashboard route
    routes/
      assets.ts                                    # MODIFY - add auto-flagging logic
      dashboard.ts                                 # NEW - 6 dashboard endpoints
    repositories/
      DashboardRepository.ts                       # NEW - aggregate queries
    __tests__/
      DashboardRepository.test.ts                  # NEW
      dashboard.route.test.ts                      # NEW
      assets.route.test.ts                         # MODIFY - auto-flagging tests
```

### Dashboard (all new)

```
dashboard/
  package.json
  vite.config.ts
  tsconfig.json
  tailwind.config.ts
  postcss.config.js
  index.html
  src/
    main.tsx                                       # Entry point
    globals.css                                    # Tailwind directives + theme vars
    api/
      client.ts                                    # Axios instance
      types.ts                                     # API response types
      hooks.ts                                     # TanStack Query hooks
    components/
      Sidebar.tsx                                  # Icon sidebar nav
      ActivityStream.tsx                           # Collapsible right panel
      Shell.tsx                                    # Root layout composing sidebar + stream
      ui/                                          # shadcn/ui components (button, table, badge, etc.)
      KPICard.tsx                                  # Reusable stat card
      StatusBadge.tsx                              # Status pill (intake/needs_review/etc.)
      ConfidenceBadge.tsx                          # Color-coded confidence display
      PeriodToggle.tsx                             # Today/Week/Month toggle
    routes/
      __root.tsx                                   # TanStack Router root (wraps Shell)
      index.tsx                                    # Command Center
      assets/
        index.tsx                                  # Asset Inventory Table
        $id.tsx                                    # Asset Detail
      operators.tsx                                # Operator Leaderboard
      ai-insights.tsx                              # AI Insights
```

### Root monorepo

```
package.json                                       # MODIFY - add dashboard workspace + scripts
.gitignore                                         # MODIFY - add .superpowers/
```

---

## Task 1: Database Migration

**Files:**
- Create: `backend/supabase/migrations/20260406000000_dashboard_indexes.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- Normalize existing status values
UPDATE assets SET status = 'intake' WHERE status = 'ingested';

-- Composite index for time-range + status queries (dashboard KPIs, intake volume)
CREATE INDEX IF NOT EXISTS idx_assets_created_status ON assets (created_at DESC, status);

-- Index for operator aggregate queries (group by user_id with time range)
CREATE INDEX IF NOT EXISTS idx_assets_user_created ON assets (user_id, created_at DESC);

-- Index for intake event time-range queries (activity stream, AI insights)
CREATE INDEX IF NOT EXISTS idx_intake_events_created ON intake_events (created_at DESC);
```

- [ ] **Step 2: Apply the migration**

Run: `cd backend && npx supabase db push`
Expected: Migration applies successfully, no errors.

- [ ] **Step 3: Verify**

Run: `cd backend && npx supabase db push` (idempotent — should show no pending migrations)

- [ ] **Step 4: Commit**

```bash
git add backend/supabase/migrations/20260406000000_dashboard_indexes.sql
git commit -m "feat: add dashboard indexes + normalize status values"
```

---

## Task 2: Dashboard App Scaffold

**Files:**
- Create: `dashboard/` directory with all scaffold files
- Modify: `package.json` (root — add workspace + scripts)
- Modify: `.gitignore` (add `.superpowers/`)

- [ ] **Step 1: Add `.superpowers/` to `.gitignore`**

Append to `/Users/zanthrash/work/mater/.gitignore`:
```
# Superpowers brainstorm artifacts
.superpowers/
```

- [ ] **Step 2: Create `dashboard/package.json`**

```json
{
  "name": "dashboard",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "@tanstack/react-router": "^1.120.0",
    "@tanstack/react-query": "^5.75.0",
    "axios": "^1.7.0",
    "recharts": "^2.15.0",
    "tailwind-merge": "^3.0.0",
    "clsx": "^2.1.0",
    "class-variance-authority": "^0.7.0",
    "lucide-react": "^0.500.0"
  },
  "devDependencies": {
    "@types/react": "^19.1.0",
    "@types/react-dom": "^19.1.0",
    "@vitejs/plugin-react": "^4.4.0",
    "typescript": "^5.7.0",
    "vite": "^6.3.0",
    "tailwindcss": "^4.1.0",
    "@tailwindcss/vite": "^4.1.0",
    "vitest": "^3.0.0",
    "@tanstack/router-plugin": "^1.120.0"
  }
}
```

- [ ] **Step 3: Create `dashboard/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Create `dashboard/vite.config.ts`**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import path from 'path'

export default defineConfig({
  plugins: [
    TanStackRouterVite({ quoteStyle: 'single' }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
  },
})
```

- [ ] **Step 5: Create `dashboard/index.html`**

```html
<!doctype html>
<html lang="en" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Mater Dashboard</title>
  </head>
  <body class="bg-slate-950 text-slate-100">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Create `dashboard/src/globals.css`**

```css
@import 'tailwindcss';

@theme {
  --color-surface-primary: #0F172A;
  --color-surface-card: #1E293B;
  --color-surface-input: #0F172A;
  --color-text-primary: #F1F5F9;
  --color-text-secondary: #94A3B8;
  --color-text-muted: #64748B;
  --color-accent-blue: #3B82F6;
  --color-accent-green: #10B981;
  --color-accent-amber: #F59E0B;
  --color-accent-red: #EF4444;
  --color-accent-purple: #8B5CF6;
  --color-border: rgba(255, 255, 255, 0.06);
}
```

- [ ] **Step 7: Create `dashboard/src/main.tsx`**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { routeTree } from './routeTree.gen'
import './globals.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchInterval: 30_000,
      staleTime: 10_000,
    },
  },
})

const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>
)
```

- [ ] **Step 8: Create route stubs**

Create `dashboard/src/routes/__root.tsx`:
```tsx
import { createRootRoute, Outlet } from '@tanstack/react-router'

export const Route = createRootRoute({
  component: () => (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Outlet />
    </div>
  ),
})
```

Create `dashboard/src/routes/index.tsx`:
```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: () => (
    <div className="flex items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold">Mater Dashboard</h1>
    </div>
  ),
})
```

- [ ] **Step 9: Update root `package.json`**

Add `"dashboard"` to workspaces:
```json
"workspaces": ["mobile", "backend", "dashboard"]
```

Add scripts:
```json
"dev:dashboard": "npm run dev --workspace=dashboard",
"test:dashboard": "npm run test --workspace=dashboard"
```

Update `test` script:
```json
"test": "npm run test:backend && npm run test:mobile && npm run test:dashboard"
```

- [ ] **Step 10: Install dependencies**

Run: `cd /Users/zanthrash/work/mater && npm install`
Expected: All dashboard dependencies installed, workspace linked.

- [ ] **Step 11: Generate route tree and verify dev server**

Run: `cd dashboard && npx vite`
Expected: Dev server starts on port 5173. Opening http://localhost:5173 shows "Mater Dashboard" centered on a dark background.

- [ ] **Step 12: Commit**

```bash
git add dashboard/ package.json .gitignore
git commit -m "feat: scaffold dashboard app with Vite + TanStack Router + Tailwind"
```

---

## Task 3: Auto-Flagging Logic in POST /api/assets

**Files:**
- Modify: `backend/src/routes/assets.ts:106-170` (POST handler)
- Modify: `backend/src/__tests__/assets.route.test.ts`

- [ ] **Step 1: Write failing tests for auto-flagging**

Add to `backend/src/__tests__/assets.route.test.ts` at the end, inside a new describe block:

```typescript
describe('POST /api/assets — auto-flagging', () => {
  const basePhotos = [{ base64: 'abc', label: 'Front', type: 'guided' }]
  const baseBody = { photos: basePhotos }

  beforeEach(() => {
    mockCreate.mockResolvedValue({ ...sampleAsset, id: 'flag-test-1', status: 'intake' })
    mockUploadPhotos.mockResolvedValue([{ url: 'https://example.com/photo.jpg' }])
    mockUpdate.mockImplementation((_id: string, data: Record<string, unknown>) =>
      Promise.resolve({ ...sampleAsset, id: 'flag-test-1', ...data })
    )
    mockCreateIntakeEvent.mockResolvedValue({ id: 'evt-1' })
  })

  it('flags needs_review when AI confidence < 0.70', async () => {
    const app = buildTestApp()
    const response = await app.inject({
      method: 'POST',
      url: '/api/assets',
      payload: {
        ...baseBody,
        coreSpecs: { make: 'CAT', model: '320', year: 2020 },
        aiTaxonomyResult: { taxonomy: { confidence: 0.55 } },
      },
    })
    expect(response.statusCode).toBe(201)
    // update is called twice: once for photos, once for status
    const statusUpdateCall = mockUpdate.mock.calls.find(
      (call: unknown[]) => (call[1] as Record<string, unknown>).status === 'needs_review'
    )
    expect(statusUpdateCall).toBeDefined()
    await app.close()
  })

  it('flags needs_review when make/model/year missing', async () => {
    const app = buildTestApp()
    const response = await app.inject({
      method: 'POST',
      url: '/api/assets',
      payload: {
        ...baseBody,
        coreSpecs: { make: 'CAT' },
        aiTaxonomyResult: { taxonomy: { confidence: 0.90 } },
      },
    })
    expect(response.statusCode).toBe(201)
    const statusUpdateCall = mockUpdate.mock.calls.find(
      (call: unknown[]) => (call[1] as Record<string, unknown>).status === 'needs_review'
    )
    expect(statusUpdateCall).toBeDefined()
    await app.close()
  })

  it('keeps intake status when confidence >= 0.70 and specs present', async () => {
    const app = buildTestApp()
    const response = await app.inject({
      method: 'POST',
      url: '/api/assets',
      payload: {
        ...baseBody,
        coreSpecs: { make: 'CAT', model: '320', year: 2020 },
        aiTaxonomyResult: { taxonomy: { confidence: 0.85 } },
      },
    })
    expect(response.statusCode).toBe(201)
    const statusUpdateCall = mockUpdate.mock.calls.find(
      (call: unknown[]) => (call[1] as Record<string, unknown>).status === 'needs_review'
    )
    expect(statusUpdateCall).toBeUndefined()
    await app.close()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && npm test`
Expected: The 3 new tests fail (auto-flagging logic doesn't exist yet).

- [ ] **Step 3: Implement auto-flagging in POST handler**

In `backend/src/routes/assets.ts`, after the intake event creation (line 162) and before the reply (line 164), add:

```typescript
        // 5. Auto-flag for review if quality thresholds not met
        const confidence = (body.aiTaxonomyResult as Record<string, unknown> | null)
          ?.taxonomy as Record<string, unknown> | undefined
        const confidenceScore = typeof confidence?.confidence === 'number'
          ? confidence.confidence
          : null

        const needsReview =
          (confidenceScore !== null && confidenceScore < 0.70) ||
          !body.coreSpecs?.make ||
          !body.coreSpecs?.model ||
          !body.coreSpecs?.year

        if (needsReview) {
          await repo.update(asset.id, { status: 'needs_review' })
        }
```

Also update the return to reflect the potentially updated status. Change the final reply line from:
```typescript
        return reply.status(201).send({ asset: updatedAsset })
```
to:
```typescript
        const finalAsset = needsReview
          ? { ...updatedAsset, status: 'needs_review' }
          : updatedAsset
        return reply.status(201).send({ asset: finalAsset })
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && npm test`
Expected: All tests pass, including the 3 new auto-flagging tests.

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/assets.ts backend/src/__tests__/assets.route.test.ts
git commit -m "feat: auto-flag assets needs_review on low confidence or missing specs"
```

---

## Task 4: DashboardRepository

**Files:**
- Create: `backend/src/repositories/DashboardRepository.ts`
- Create: `backend/src/__tests__/DashboardRepository.test.ts`

- [ ] **Step 1: Write the DashboardRepository interface and types**

Create `backend/src/repositories/DashboardRepository.ts`:

```typescript
import type { SupabaseClient } from '@supabase/supabase-js'

export type Period = 'today' | 'week' | 'month'

export interface DashboardStats {
  intakeCount: number
  intakeCountPrevious: number
  activeOperators: number
  totalOperators: number
  needsReviewCount: number
  needsReviewBreakdown: { lowConfidence: number; missingFields: number }
  avgConfidence: number
}

export interface IntakeVolumeBucket {
  label: string
  count: number
}

export interface CategoryCount {
  category: string
  count: number
}

export interface OperatorStats {
  id: string
  displayName: string
  email: string
  intakeCount: number
  avgConfidence: number
  flaggedCount: number
  lastIntakeAt: string | null
  isActive: boolean
}

export interface AiInsights {
  avgClassificationConfidence: number
  avgSpecConfidence: number
  overrideRate: number
  vinMatchRate: number
  confidenceTrend: Array<{ date: string; classification: number; spec: number }>
  confidenceDistribution: Array<{ bucket: string; count: number }>
  misclassifications: Array<{ aiCategory: string; actualCategory: string; count: number }>
  categoryAccuracy: Array<{ category: string; avgConfidence: number }>
  vinAgreement: { make: number; model: number; year: number; engineType: number; gvw: number }
  vinSources: { nhtsa: number; claude: number; none: number }
}

export interface ActivityEvent {
  id: string
  type: string
  operatorName: string
  assetId: string
  assetName: string
  category: string
  confidence: number | null
  status: string
  createdAt: string
  photoCount: number
}

export class DashboardRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  private getDateRange(period: Period): { start: string; end: string } {
    const now = new Date()
    const end = now.toISOString()
    let start: Date

    switch (period) {
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'week':
        start = new Date(now)
        start.setDate(start.getDate() - 7)
        break
      case 'month':
        start = new Date(now)
        start.setMonth(start.getMonth() - 1)
        break
    }
    return { start: start.toISOString(), end }
  }

  private getPreviousDateRange(period: Period): { start: string; end: string } {
    const { start, end } = this.getDateRange(period)
    const duration = new Date(end).getTime() - new Date(start).getTime()
    const prevEnd = new Date(start)
    const prevStart = new Date(prevEnd.getTime() - duration)
    return { start: prevStart.toISOString(), end: prevEnd.toISOString() }
  }

  async getStats(period: Period): Promise<DashboardStats> {
    const { start, end } = this.getDateRange(period)
    const prev = this.getPreviousDateRange(period)

    // Current period count
    const { count: intakeCount } = await this.supabase
      .from('assets')
      .select('*', { count: 'exact', head: true })
      .neq('status', 'deleted')
      .gte('created_at', start)
      .lte('created_at', end)

    // Previous period count
    const { count: intakeCountPrevious } = await this.supabase
      .from('assets')
      .select('*', { count: 'exact', head: true })
      .neq('status', 'deleted')
      .gte('created_at', prev.start)
      .lte('created_at', prev.end)

    // Needs review count
    const { count: needsReviewCount } = await this.supabase
      .from('assets')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'needs_review')

    // Active operators (intake in last 30 min)
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
    const { data: recentEvents } = await this.supabase
      .from('intake_events')
      .select('asset_id, assets!inner(user_id)')
      .gte('created_at', thirtyMinAgo)

    const activeUserIds = new Set(
      (recentEvents ?? [])
        .map((e: Record<string, unknown>) => (e.assets as Record<string, unknown>)?.user_id)
        .filter(Boolean)
    )

    // Total operators
    const { count: totalOperators } = await this.supabase
      .from('users')
      .select('*', { count: 'exact', head: true })

    // Avg confidence — fetch intake events in range with ai_taxonomy_result
    const { data: eventsWithConf } = await this.supabase
      .from('intake_events')
      .select('ai_taxonomy_result')
      .gte('created_at', start)
      .lte('created_at', end)

    let totalConf = 0
    let confCount = 0
    let lowConfCount = 0
    for (const evt of eventsWithConf ?? []) {
      const conf = (evt.ai_taxonomy_result as Record<string, unknown>)?.taxonomy as Record<string, unknown> | undefined
      const score = typeof conf?.confidence === 'number' ? conf.confidence : null
      if (score !== null) {
        totalConf += score
        confCount++
        if (score < 0.70) lowConfCount++
      }
    }

    // Missing fields count for needs_review breakdown
    const { count: missingFieldsCount } = await this.supabase
      .from('assets')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'needs_review')
      .or('make.is.null,model.is.null,year.is.null')

    return {
      intakeCount: intakeCount ?? 0,
      intakeCountPrevious: intakeCountPrevious ?? 0,
      activeOperators: activeUserIds.size,
      totalOperators: totalOperators ?? 0,
      needsReviewCount: needsReviewCount ?? 0,
      needsReviewBreakdown: {
        lowConfidence: Math.max(0, (needsReviewCount ?? 0) - (missingFieldsCount ?? 0)),
        missingFields: missingFieldsCount ?? 0,
      },
      avgConfidence: confCount > 0 ? totalConf / confCount : 0,
    }
  }

  async getIntakeVolume(period: Period): Promise<IntakeVolumeBucket[]> {
    const { start, end } = this.getDateRange(period)

    const { data: assets } = await this.supabase
      .from('assets')
      .select('created_at')
      .neq('status', 'deleted')
      .gte('created_at', start)
      .lte('created_at', end)
      .order('created_at', { ascending: true })

    if (!assets || assets.length === 0) return []

    const buckets = new Map<string, number>()
    for (const asset of assets) {
      const date = new Date(asset.created_at)
      let label: string
      if (period === 'today') {
        label = `${date.getHours().toString().padStart(2, '0')}:00`
      } else if (period === 'week') {
        label = date.toLocaleDateString('en-US', { weekday: 'short' })
      } else {
        label = `Week ${Math.ceil(date.getDate() / 7)}`
      }
      buckets.set(label, (buckets.get(label) ?? 0) + 1)
    }

    return Array.from(buckets, ([label, count]) => ({ label, count }))
  }

  async getCategoryBreakdown(period: Period): Promise<CategoryCount[]> {
    const { start, end } = this.getDateRange(period)

    const { data: assets } = await this.supabase
      .from('assets')
      .select('category')
      .neq('status', 'deleted')
      .gte('created_at', start)
      .lte('created_at', end)

    if (!assets) return []

    const counts = new Map<string, number>()
    for (const asset of assets) {
      const cat = asset.category ?? 'Unknown'
      counts.set(cat, (counts.get(cat) ?? 0) + 1)
    }

    return Array.from(counts, ([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
  }

  async getOperatorStats(period: Period): Promise<OperatorStats[]> {
    const { start, end } = this.getDateRange(period)
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()

    // Get all users
    const { data: users } = await this.supabase.from('users').select('*')
    if (!users) return []

    // Get assets in period with user_id
    const { data: assets } = await this.supabase
      .from('assets')
      .select('user_id, status, created_at')
      .neq('status', 'deleted')
      .gte('created_at', start)
      .lte('created_at', end)

    // Get intake events for confidence
    const { data: events } = await this.supabase
      .from('intake_events')
      .select('asset_id, created_at, ai_taxonomy_result, assets!inner(user_id)')
      .gte('created_at', start)
      .lte('created_at', end)

    const result: OperatorStats[] = []
    for (const user of users) {
      const userAssets = (assets ?? []).filter((a: Record<string, unknown>) => a.user_id === user.id)
      const userEvents = (events ?? []).filter(
        (e: Record<string, unknown>) => (e.assets as Record<string, unknown>)?.user_id === user.id
      )

      let totalConf = 0
      let confCount = 0
      let lastIntakeAt: string | null = null

      for (const evt of userEvents) {
        const conf = (evt.ai_taxonomy_result as Record<string, unknown>)?.taxonomy as Record<string, unknown> | undefined
        const score = typeof conf?.confidence === 'number' ? conf.confidence : null
        if (score !== null) {
          totalConf += score
          confCount++
        }
        if (!lastIntakeAt || evt.created_at > lastIntakeAt) {
          lastIntakeAt = evt.created_at as string
        }
      }

      result.push({
        id: user.id,
        displayName: user.display_name,
        email: user.email,
        intakeCount: userAssets.length,
        avgConfidence: confCount > 0 ? totalConf / confCount : 0,
        flaggedCount: userAssets.filter((a: Record<string, unknown>) => a.status === 'needs_review').length,
        lastIntakeAt,
        isActive: lastIntakeAt !== null && lastIntakeAt >= thirtyMinAgo,
      })
    }

    return result.sort((a, b) => b.intakeCount - a.intakeCount)
  }

  async getAiInsights(period: Period): Promise<AiInsights> {
    const { start, end } = this.getDateRange(period)

    // Fetch all intake events in period with related asset data
    const { data: events } = await this.supabase
      .from('intake_events')
      .select('*, assets!inner(category, type, subtype, make, model, year, engine_type, gvw_lbs)')
      .gte('created_at', start)
      .lte('created_at', end)
      .order('created_at', { ascending: true })

    if (!events || events.length === 0) {
      return {
        avgClassificationConfidence: 0, avgSpecConfidence: 0,
        overrideRate: 0, vinMatchRate: 0,
        confidenceTrend: [], confidenceDistribution: [],
        misclassifications: [], categoryAccuracy: [],
        vinAgreement: { make: 0, model: 0, year: 0, engineType: 0, gvw: 0 },
        vinSources: { nhtsa: 0, claude: 0, none: 0 },
      }
    }

    let classConfTotal = 0, classConfCount = 0
    let specConfTotal = 0, specConfCount = 0
    let overrideCount = 0, classifiedCount = 0
    let vinMatchMake = 0, vinMatchModel = 0, vinMatchYear = 0
    let vinMatchEngine = 0, vinMatchGvw = 0, vinCompareCount = 0
    let vinNhtsa = 0, vinClaude = 0, vinNone = 0

    const distBuckets: Record<string, number> = { '0-20': 0, '20-40': 0, '40-60': 0, '60-80': 0, '80-100': 0 }
    const catConfMap = new Map<string, { total: number; count: number }>()
    const misclassMap = new Map<string, number>()
    const trendMap = new Map<string, { classTotal: number; classCount: number; specTotal: number; specCount: number }>()

    for (const evt of events) {
      const aiTax = evt.ai_taxonomy_result as Record<string, unknown> | null
      const aiAnalysis = evt.ai_analysis_result as Record<string, unknown> | null
      const vinResult = evt.vin_lookup_result as Record<string, unknown> | null
      const asset = evt.assets as Record<string, unknown>

      // Classification confidence
      const taxData = aiTax?.taxonomy as Record<string, unknown> | undefined
      const classConf = typeof taxData?.confidence === 'number' ? taxData.confidence : null
      if (classConf !== null) {
        classConfTotal += classConf
        classConfCount++

        // Distribution
        const pct = classConf * 100
        if (pct < 20) distBuckets['0-20']++
        else if (pct < 40) distBuckets['20-40']++
        else if (pct < 60) distBuckets['40-60']++
        else if (pct < 80) distBuckets['60-80']++
        else distBuckets['80-100']++

        // Category accuracy
        const cat = asset.category as string
        if (cat) {
          const existing = catConfMap.get(cat) ?? { total: 0, count: 0 }
          existing.total += classConf
          existing.count++
          catConfMap.set(cat, existing)
        }
      }

      // Spec confidence
      const specConf = typeof aiAnalysis?.confidenceScore === 'number' ? aiAnalysis.confidenceScore : null
      if (specConf !== null) {
        specConfTotal += specConf
        specConfCount++
      }

      // Trend (group by date)
      const dateKey = new Date(evt.created_at).toISOString().split('T')[0]
      const trend = trendMap.get(dateKey) ?? { classTotal: 0, classCount: 0, specTotal: 0, specCount: 0 }
      if (classConf !== null) { trend.classTotal += classConf; trend.classCount++ }
      if (specConf !== null) { trend.specTotal += specConf; trend.specCount++ }
      trendMap.set(dateKey, trend)

      // Override detection
      if (taxData) {
        classifiedCount++
        const aiCat = taxData.category as string
        const aiType = taxData.type as string
        if (aiCat && asset.category && (aiCat !== asset.category || aiType !== asset.type)) {
          overrideCount++
          const key = `${aiCat}:${aiType}→${asset.category}:${asset.type}`
          misclassMap.set(key, (misclassMap.get(key) ?? 0) + 1)
        }
      }

      // VIN agreement
      if (vinResult && vinResult.source) {
        const src = vinResult.source as string
        if (src === 'nhtsa') vinNhtsa++
        else if (src === 'claude') vinClaude++

        vinCompareCount++
        if (vinResult.make && vinResult.make === asset.make) vinMatchMake++
        if (vinResult.model && vinResult.model === asset.model) vinMatchModel++
        if (vinResult.year && vinResult.year === asset.year) vinMatchYear++
        if (vinResult.engineType && vinResult.engineType === asset.engine_type) vinMatchEngine++
        if (vinResult.gvwLbs && vinResult.gvwLbs === asset.gvw_lbs) vinMatchGvw++
      } else {
        vinNone++
      }
    }

    const totalVinSources = vinNhtsa + vinClaude + vinNone
    const safe = (n: number, d: number) => d > 0 ? n / d : 0

    return {
      avgClassificationConfidence: safe(classConfTotal, classConfCount),
      avgSpecConfidence: safe(specConfTotal, specConfCount),
      overrideRate: safe(overrideCount, classifiedCount),
      vinMatchRate: safe(vinMatchMake + vinMatchModel + vinMatchYear, vinCompareCount * 3),
      confidenceTrend: Array.from(trendMap, ([date, t]) => ({
        date,
        classification: safe(t.classTotal, t.classCount),
        spec: safe(t.specTotal, t.specCount),
      })),
      confidenceDistribution: Object.entries(distBuckets).map(([bucket, count]) => ({ bucket, count })),
      misclassifications: Array.from(misclassMap, ([key, count]) => {
        const [ai, actual] = key.split('→')
        return { aiCategory: ai, actualCategory: actual, count }
      }).sort((a, b) => b.count - a.count).slice(0, 10),
      categoryAccuracy: Array.from(catConfMap, ([category, { total, count }]) => ({
        category,
        avgConfidence: total / count,
      })).sort((a, b) => b.avgConfidence - a.avgConfidence),
      vinAgreement: {
        make: safe(vinMatchMake, vinCompareCount),
        model: safe(vinMatchModel, vinCompareCount),
        year: safe(vinMatchYear, vinCompareCount),
        engineType: safe(vinMatchEngine, vinCompareCount),
        gvw: safe(vinMatchGvw, vinCompareCount),
      },
      vinSources: {
        nhtsa: safe(vinNhtsa, totalVinSources),
        claude: safe(vinClaude, totalVinSources),
        none: safe(vinNone, totalVinSources),
      },
    }
  }

  async getRecentActivity(limit: number = 20, since?: string): Promise<ActivityEvent[]> {
    let query = this.supabase
      .from('intake_events')
      .select('id, created_at, operator_name, ai_taxonomy_result, source_photos, asset_id, assets!inner(id, make, model, category, status, photos)')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (since) {
      query = query.gt('created_at', since)
    }

    const { data: events } = await query
    if (!events) return []

    return events.map((evt: Record<string, unknown>) => {
      const asset = evt.assets as Record<string, unknown>
      const aiTax = evt.ai_taxonomy_result as Record<string, unknown> | null
      const taxData = aiTax?.taxonomy as Record<string, unknown> | undefined
      const photos = asset.photos as unknown[] | null

      return {
        id: evt.id as string,
        type: 'submission',
        operatorName: (evt.operator_name as string) ?? 'Unknown',
        assetId: asset.id as string,
        assetName: [asset.make, asset.model].filter(Boolean).join(' ') || 'Unknown Asset',
        category: (asset.category as string) ?? 'Unknown',
        confidence: typeof taxData?.confidence === 'number' ? taxData.confidence : null,
        status: (asset.status as string) ?? 'intake',
        createdAt: evt.created_at as string,
        photoCount: photos?.length ?? 0,
      }
    })
  }
}
```

- [ ] **Step 2: Write tests for DashboardRepository**

Create `backend/src/__tests__/DashboardRepository.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DashboardRepository } from '../repositories/DashboardRepository.js'

function makeCountQuery(count: number) {
  const builder: Record<string, unknown> = {}
  const chain = () => builder
  builder.neq = vi.fn(chain)
  builder.eq = vi.fn(chain)
  builder.or = vi.fn(chain)
  builder.gte = vi.fn(chain)
  builder.lte = vi.fn(chain)
  builder.gt = vi.fn(chain)
  // head: true queries resolve with just count
  return { ...builder, then: (fn: (v: unknown) => void) => fn({ count, error: null }) }
}

function makeDataQuery(data: unknown[]) {
  const builder: Record<string, unknown> = {}
  const chain = () => builder
  builder.neq = vi.fn(chain)
  builder.eq = vi.fn(chain)
  builder.or = vi.fn(chain)
  builder.gte = vi.fn(chain)
  builder.lte = vi.fn(chain)
  builder.gt = vi.fn(chain)
  builder.order = vi.fn(chain)
  builder.limit = vi.fn(chain)
  builder.range = vi.fn(() => Promise.resolve({ data, error: null }))
  // Make it thenable for queries without range
  builder.then = (fn: (v: unknown) => void) => fn({ data, error: null })
  return builder
}

let countQueryResult: number
let dataQueryResult: unknown[]
let tableQueries: Map<string, { countResult?: number; dataResult?: unknown[] }>

const mockFrom = vi.fn((table: string) => {
  const config = tableQueries.get(table)
  return {
    select: (_sel?: string, opts?: Record<string, unknown>) => {
      if (opts?.head === true) {
        return makeCountQuery(config?.countResult ?? 0)
      }
      return makeDataQuery(config?.dataResult ?? [])
    },
  }
})

const mockSupabase = { from: mockFrom } as any

let repo: DashboardRepository

beforeEach(() => {
  vi.clearAllMocks()
  tableQueries = new Map()
  repo = new DashboardRepository(mockSupabase)
})

describe('getRecentActivity', () => {
  it('returns mapped activity events', async () => {
    tableQueries.set('intake_events', {
      dataResult: [{
        id: 'evt-1',
        created_at: '2026-04-06T14:00:00Z',
        operator_name: 'Mike S.',
        ai_taxonomy_result: { taxonomy: { confidence: 0.92 } },
        source_photos: [],
        asset_id: 'a-1',
        assets: { id: 'a-1', make: 'CAT', model: '320F', category: 'Earthmoving', status: 'intake', photos: [{}, {}, {}] },
      }],
    })

    const result = await repo.getRecentActivity(10)
    expect(result).toHaveLength(1)
    expect(result[0].operatorName).toBe('Mike S.')
    expect(result[0].assetName).toBe('CAT 320F')
    expect(result[0].confidence).toBe(0.92)
    expect(result[0].photoCount).toBe(3)
  })

  it('returns empty array when no events', async () => {
    tableQueries.set('intake_events', { dataResult: [] })
    const result = await repo.getRecentActivity(10)
    expect(result).toEqual([])
  })
})

describe('getCategoryBreakdown', () => {
  it('groups and sorts by count descending', async () => {
    tableQueries.set('assets', {
      dataResult: [
        { category: 'Earthmoving' },
        { category: 'Earthmoving' },
        { category: 'Trucking' },
        { category: 'Earthmoving' },
        { category: 'Trucking' },
        { category: 'Aerial' },
      ],
    })

    const result = await repo.getCategoryBreakdown('week')
    expect(result[0]).toEqual({ category: 'Earthmoving', count: 3 })
    expect(result[1]).toEqual({ category: 'Trucking', count: 2 })
    expect(result[2]).toEqual({ category: 'Aerial', count: 1 })
  })
})

describe('getIntakeVolume', () => {
  it('returns empty for no assets', async () => {
    tableQueries.set('assets', { dataResult: [] })
    const result = await repo.getIntakeVolume('today')
    expect(result).toEqual([])
  })
})
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `cd backend && npm test -- --testPathPattern=DashboardRepository`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add backend/src/repositories/DashboardRepository.ts backend/src/__tests__/DashboardRepository.test.ts
git commit -m "feat: add DashboardRepository with aggregate query methods"
```

---

## Task 5: Dashboard API Routes

**Files:**
- Create: `backend/src/routes/dashboard.ts`
- Create: `backend/src/__tests__/dashboard.route.test.ts`
- Modify: `backend/src/app.ts`

- [ ] **Step 1: Write the route file**

Create `backend/src/routes/dashboard.ts`:

```typescript
import type { FastifyPluginAsync } from 'fastify'
import { createClient } from '@supabase/supabase-js'
import { config } from '../config.js'
import { DashboardRepository } from '../repositories/DashboardRepository.js'
import type { Period } from '../repositories/DashboardRepository.js'

interface PeriodQuery {
  period?: string
}

interface ActivityQuery {
  limit?: string
  since?: string
}

export const dashboardRoute: FastifyPluginAsync = async (fastify) => {
  const supabase = createClient(config.supabaseUrl!, config.supabaseKey!)
  const repo = new DashboardRepository(supabase)

  const parsePeriod = (raw?: string): Period => {
    if (raw === 'today' || raw === 'week' || raw === 'month') return raw
    return 'today'
  }

  fastify.get<{ Querystring: PeriodQuery }>('/api/dashboard/stats', async (request, reply) => {
    try {
      const period = parsePeriod(request.query.period)
      const stats = await repo.getStats(period)
      return reply.send(stats)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return reply.status(500).send({ error: message })
    }
  })

  fastify.get<{ Querystring: PeriodQuery }>('/api/dashboard/intake-volume', async (request, reply) => {
    try {
      const period = parsePeriod(request.query.period)
      const buckets = await repo.getIntakeVolume(period)
      return reply.send({ buckets })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return reply.status(500).send({ error: message })
    }
  })

  fastify.get<{ Querystring: PeriodQuery }>('/api/dashboard/category-breakdown', async (request, reply) => {
    try {
      const period = parsePeriod(request.query.period)
      const categories = await repo.getCategoryBreakdown(period)
      return reply.send({ categories })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return reply.status(500).send({ error: message })
    }
  })

  fastify.get<{ Querystring: PeriodQuery }>('/api/dashboard/operators', async (request, reply) => {
    try {
      const period = parsePeriod(request.query.period)
      const operators = await repo.getOperatorStats(period)
      return reply.send({ operators })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return reply.status(500).send({ error: message })
    }
  })

  fastify.get<{ Querystring: PeriodQuery }>('/api/dashboard/ai-insights', async (request, reply) => {
    try {
      const period = parsePeriod(request.query.period)
      const insights = await repo.getAiInsights(period)
      return reply.send(insights)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return reply.status(500).send({ error: message })
    }
  })

  fastify.get<{ Querystring: ActivityQuery }>('/api/dashboard/activity', async (request, reply) => {
    try {
      const limit = request.query.limit ? parseInt(request.query.limit, 10) : 20
      const events = await repo.getRecentActivity(limit, request.query.since)
      return reply.send({ events })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return reply.status(500).send({ error: message })
    }
  })
}
```

- [ ] **Step 2: Register in app.ts**

Add to `backend/src/app.ts`:

```typescript
import { dashboardRoute } from './routes/dashboard.js'
```

And in `buildApp()`:
```typescript
app.register(dashboardRoute)
```

- [ ] **Step 3: Write route tests**

Create `backend/src/__tests__/dashboard.route.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'
import { dashboardRoute } from '../routes/dashboard.js'

const mockGetStats = vi.fn()
const mockGetIntakeVolume = vi.fn()
const mockGetCategoryBreakdown = vi.fn()
const mockGetOperatorStats = vi.fn()
const mockGetAiInsights = vi.fn()
const mockGetRecentActivity = vi.fn()

vi.mock('../repositories/DashboardRepository.js', () => ({
  DashboardRepository: vi.fn(() => ({
    getStats: mockGetStats,
    getIntakeVolume: mockGetIntakeVolume,
    getCategoryBreakdown: mockGetCategoryBreakdown,
    getOperatorStats: mockGetOperatorStats,
    getAiInsights: mockGetAiInsights,
    getRecentActivity: mockGetRecentActivity,
  })),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({})),
}))

function buildTestApp() {
  const app = Fastify()
  app.register(dashboardRoute)
  return app
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/dashboard/stats', () => {
  it('returns stats for default period', async () => {
    const stats = { intakeCount: 47, intakeCountPrevious: 42, activeOperators: 5, totalOperators: 8, needsReviewCount: 12, needsReviewBreakdown: { lowConfidence: 4, missingFields: 8 }, avgConfidence: 0.84 }
    mockGetStats.mockResolvedValue(stats)
    const app = buildTestApp()
    const response = await app.inject({ method: 'GET', url: '/api/dashboard/stats' })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual(stats)
    expect(mockGetStats).toHaveBeenCalledWith('today')
    await app.close()
  })

  it('passes period query param', async () => {
    mockGetStats.mockResolvedValue({})
    const app = buildTestApp()
    await app.inject({ method: 'GET', url: '/api/dashboard/stats?period=week' })
    expect(mockGetStats).toHaveBeenCalledWith('week')
    await app.close()
  })

  it('returns 500 on error', async () => {
    mockGetStats.mockRejectedValue(new Error('DB down'))
    const app = buildTestApp()
    const response = await app.inject({ method: 'GET', url: '/api/dashboard/stats' })
    expect(response.statusCode).toBe(500)
    expect(response.json()).toEqual({ error: 'DB down' })
    await app.close()
  })
})

describe('GET /api/dashboard/activity', () => {
  it('returns activity events', async () => {
    const events = [{ id: 'e1', type: 'submission', operatorName: 'Mike', assetId: 'a1', assetName: 'CAT 320F', category: 'Earthmoving', confidence: 0.92, status: 'intake', createdAt: '2026-04-06T14:00:00Z', photoCount: 7 }]
    mockGetRecentActivity.mockResolvedValue(events)
    const app = buildTestApp()
    const response = await app.inject({ method: 'GET', url: '/api/dashboard/activity' })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ events })
    expect(mockGetRecentActivity).toHaveBeenCalledWith(20, undefined)
    await app.close()
  })

  it('passes limit and since params', async () => {
    mockGetRecentActivity.mockResolvedValue([])
    const app = buildTestApp()
    await app.inject({ method: 'GET', url: '/api/dashboard/activity?limit=5&since=2026-04-06T14:00:00Z' })
    expect(mockGetRecentActivity).toHaveBeenCalledWith(5, '2026-04-06T14:00:00Z')
    await app.close()
  })
})

describe('GET /api/dashboard/intake-volume', () => {
  it('returns buckets', async () => {
    mockGetIntakeVolume.mockResolvedValue([{ label: 'Mon', count: 32 }])
    const app = buildTestApp()
    const response = await app.inject({ method: 'GET', url: '/api/dashboard/intake-volume?period=week' })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ buckets: [{ label: 'Mon', count: 32 }] })
    await app.close()
  })
})

describe('GET /api/dashboard/category-breakdown', () => {
  it('returns categories', async () => {
    mockGetCategoryBreakdown.mockResolvedValue([{ category: 'Earthmoving', count: 18 }])
    const app = buildTestApp()
    const response = await app.inject({ method: 'GET', url: '/api/dashboard/category-breakdown?period=month' })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ categories: [{ category: 'Earthmoving', count: 18 }] })
    await app.close()
  })
})

describe('GET /api/dashboard/operators', () => {
  it('returns operator stats', async () => {
    mockGetOperatorStats.mockResolvedValue([{ id: 'u1', displayName: 'Mike', intakeCount: 14 }])
    const app = buildTestApp()
    const response = await app.inject({ method: 'GET', url: '/api/dashboard/operators?period=today' })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ operators: [{ id: 'u1', displayName: 'Mike', intakeCount: 14 }] })
    await app.close()
  })
})

describe('GET /api/dashboard/ai-insights', () => {
  it('returns insights', async () => {
    const insights = { avgClassificationConfidence: 0.84, avgSpecConfidence: 0.79 }
    mockGetAiInsights.mockResolvedValue(insights)
    const app = buildTestApp()
    const response = await app.inject({ method: 'GET', url: '/api/dashboard/ai-insights?period=week' })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual(insights)
    await app.close()
  })
})
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && npm test`
Expected: All tests pass, including the new dashboard route tests.

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/dashboard.ts backend/src/__tests__/dashboard.route.test.ts backend/src/app.ts
git commit -m "feat: add dashboard API routes (stats, volume, categories, operators, ai-insights, activity)"
```

---

## Task 6: Dashboard API Client & Hooks

**Files:**
- Create: `dashboard/src/api/types.ts`
- Create: `dashboard/src/api/client.ts`
- Create: `dashboard/src/api/hooks.ts`

- [ ] **Step 1: Create API types**

Create `dashboard/src/api/types.ts`:

```typescript
export interface DashboardStats {
  intakeCount: number
  intakeCountPrevious: number
  activeOperators: number
  totalOperators: number
  needsReviewCount: number
  needsReviewBreakdown: { lowConfidence: number; missingFields: number }
  avgConfidence: number
}

export interface IntakeVolumeBucket {
  label: string
  count: number
}

export interface CategoryCount {
  category: string
  count: number
}

export interface OperatorStats {
  id: string
  displayName: string
  email: string
  intakeCount: number
  avgConfidence: number
  flaggedCount: number
  lastIntakeAt: string | null
  isActive: boolean
}

export interface AiInsights {
  avgClassificationConfidence: number
  avgSpecConfidence: number
  overrideRate: number
  vinMatchRate: number
  confidenceTrend: Array<{ date: string; classification: number; spec: number }>
  confidenceDistribution: Array<{ bucket: string; count: number }>
  misclassifications: Array<{ aiCategory: string; actualCategory: string; count: number }>
  categoryAccuracy: Array<{ category: string; avgConfidence: number }>
  vinAgreement: { make: number; model: number; year: number; engineType: number; gvw: number }
  vinSources: { nhtsa: number; claude: number; none: number }
}

export interface ActivityEvent {
  id: string
  type: string
  operatorName: string
  assetId: string
  assetName: string
  category: string
  confidence: number | null
  status: string
  createdAt: string
  photoCount: number
}

export interface Asset {
  id: string
  created_at: string
  updated_at: string
  vin_serial: string | null
  category: string | null
  type: string | null
  subtype: string | null
  make: string | null
  model: string | null
  year: number | null
  engine_type: string | null
  transmission: string | null
  gvw_lbs: number | null
  hours_on_meter: number | null
  type_specific_specs: Record<string, string | number | null>
  lot_number: string | null
  yard_location: string | null
  consignor: string | null
  photos: Array<{ url: string; label: string; type: 'guided' | 'extra' }>
  status: string
  user_id: string | null
}

export interface IntakeEvent {
  id: string
  asset_id: string
  created_at: string
  operator_name: string | null
  gps_lat: number | null
  gps_lon: number | null
  ai_analysis_result: Record<string, unknown> | null
  vin_lookup_result: Record<string, unknown> | null
  ai_taxonomy_result: Record<string, unknown> | null
  source_photos: Array<{ url: string; label: string }> | null
}

export type Period = 'today' | 'week' | 'month'
```

- [ ] **Step 2: Create API client**

Create `dashboard/src/api/client.ts`:

```typescript
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 15_000,
})
```

- [ ] **Step 3: Create TanStack Query hooks**

Create `dashboard/src/api/hooks.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import type { DashboardStats, IntakeVolumeBucket, CategoryCount, OperatorStats, AiInsights, ActivityEvent, Asset, IntakeEvent, Period } from './types'

export function useDashboardStats(period: Period) {
  return useQuery({
    queryKey: ['dashboard', 'stats', period],
    queryFn: async () => {
      const { data } = await api.get<DashboardStats>('/api/dashboard/stats', { params: { period } })
      return data
    },
  })
}

export function useIntakeVolume(period: Period) {
  return useQuery({
    queryKey: ['dashboard', 'intake-volume', period],
    queryFn: async () => {
      const { data } = await api.get<{ buckets: IntakeVolumeBucket[] }>('/api/dashboard/intake-volume', { params: { period } })
      return data.buckets
    },
  })
}

export function useCategoryBreakdown(period: Period) {
  return useQuery({
    queryKey: ['dashboard', 'category-breakdown', period],
    queryFn: async () => {
      const { data } = await api.get<{ categories: CategoryCount[] }>('/api/dashboard/category-breakdown', { params: { period } })
      return data.categories
    },
  })
}

export function useOperatorStats(period: Period) {
  return useQuery({
    queryKey: ['dashboard', 'operators', period],
    queryFn: async () => {
      const { data } = await api.get<{ operators: OperatorStats[] }>('/api/dashboard/operators', { params: { period } })
      return data.operators
    },
  })
}

export function useAiInsights(period: Period) {
  return useQuery({
    queryKey: ['dashboard', 'ai-insights', period],
    queryFn: async () => {
      const { data } = await api.get<AiInsights>('/api/dashboard/ai-insights', { params: { period } })
      return data
    },
  })
}

export function useActivityStream(limit: number = 20) {
  return useQuery({
    queryKey: ['dashboard', 'activity', limit],
    queryFn: async () => {
      const { data } = await api.get<{ events: ActivityEvent[] }>('/api/dashboard/activity', { params: { limit } })
      return data.events
    },
    refetchInterval: 15_000,
  })
}

export function useAssets(params: {
  status?: string
  category?: string
  type?: string
  make?: string
  search?: string
  userId?: string
  limit?: number
  offset?: number
}) {
  return useQuery({
    queryKey: ['assets', params],
    queryFn: async () => {
      const { data } = await api.get<{ data: Asset[]; total: number }>('/api/assets', { params })
      return data
    },
  })
}

export function useAsset(id: string) {
  return useQuery({
    queryKey: ['assets', id],
    queryFn: async () => {
      const { data } = await api.get<Asset>(`/api/assets/${id}`)
      return data
    },
  })
}

export function useIntakeEvents(assetId: string) {
  return useQuery({
    queryKey: ['assets', assetId, 'intake-events'],
    queryFn: async () => {
      const { data } = await api.get<{ events: IntakeEvent[] }>(`/api/assets/${assetId}/intake-events`)
      return data.events
    },
  })
}

export function useUpdateAsset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Asset> }) => {
      const { data } = await api.put<Asset>(`/api/assets/${id}`, updates)
      return data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['assets', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['assets'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
```

- [ ] **Step 4: Commit**

```bash
git add dashboard/src/api/
git commit -m "feat: add dashboard API client, types, and TanStack Query hooks"
```

---

## Task 7: Dashboard Shell Layout & Shared Components

**Files:**
- Create: `dashboard/src/components/Sidebar.tsx`
- Create: `dashboard/src/components/ActivityStream.tsx`
- Create: `dashboard/src/components/Shell.tsx`
- Create: `dashboard/src/components/KPICard.tsx`
- Create: `dashboard/src/components/StatusBadge.tsx`
- Create: `dashboard/src/components/ConfidenceBadge.tsx`
- Create: `dashboard/src/components/PeriodToggle.tsx`
- Modify: `dashboard/src/routes/__root.tsx`

This task creates all shared components. Each component is small and focused — create them all in sequence, then wire them into the root layout.

- [ ] **Step 1: Install shadcn/ui base components**

Run:
```bash
cd dashboard && npx shadcn@latest init -d
npx shadcn@latest add button table badge input
```

- [ ] **Step 2: Create Sidebar**

Create `dashboard/src/components/Sidebar.tsx`:

```tsx
import { Link, useMatchRoute } from '@tanstack/react-router'
import { BarChart3, Package, Users, Bot, Settings } from 'lucide-react'

const navItems = [
  { to: '/', icon: BarChart3, label: 'Dashboard' },
  { to: '/assets', icon: Package, label: 'Assets' },
  { to: '/operators', icon: Users, label: 'Operators' },
  { to: '/ai-insights', icon: Bot, label: 'AI Insights' },
] as const

export function Sidebar() {
  const matchRoute = useMatchRoute()

  return (
    <div className="w-14 bg-[var(--color-surface-primary)] border-r border-[var(--color-border)] flex flex-col items-center py-3 gap-1.5 shrink-0">
      <div className="w-8 h-8 bg-[var(--color-accent-blue)] rounded-lg flex items-center justify-center text-sm font-extrabold text-white mb-3">
        M
      </div>
      {navItems.map(({ to, icon: Icon, label }) => {
        const isActive = matchRoute({ to, fuzzy: to !== '/' })
        return (
          <Link key={to} to={to} className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${isActive ? 'bg-[var(--color-accent-blue)]/15 text-[var(--color-accent-blue)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'}`} title={label}>
            <Icon size={18} />
          </Link>
        )
      })}
      <div className="flex-1" />
      <Link to="/" className="w-9 h-9 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]" title="Settings">
        <Settings size={18} />
      </Link>
    </div>
  )
}
```

- [ ] **Step 3: Create ActivityStream**

Create `dashboard/src/components/ActivityStream.tsx`:

```tsx
import { useState } from 'react'
import { useActivityStream } from '@/api/hooks'
import { ConfidenceBadge } from './ConfidenceBadge'
import { ChevronLeft, ChevronRight } from 'lucide-react'

function getEventColor(confidence: number | null): string {
  if (confidence === null) return 'var(--color-accent-blue)'
  if (confidence < 0.5) return 'var(--color-accent-red)'
  if (confidence < 0.7) return 'var(--color-accent-amber)'
  return 'var(--color-accent-blue)'
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

export function ActivityStream({ collapsed = false }: { collapsed?: boolean }) {
  const [isCollapsed, setIsCollapsed] = useState(collapsed)
  const { data: events } = useActivityStream()

  if (isCollapsed) {
    return (
      <div className="w-9 bg-[var(--color-surface-primary)] border-l border-[var(--color-border)] flex flex-col items-center pt-3 cursor-pointer shrink-0" onClick={() => setIsCollapsed(false)}>
        <span className="text-[var(--color-text-muted)] text-xs [writing-mode:vertical-rl] tracking-widest">ACTIVITY</span>
        <ChevronLeft size={14} className="text-[var(--color-text-muted)] mt-2" />
      </div>
    )
  }

  return (
    <div className="w-56 bg-[var(--color-surface-primary)] border-l border-[var(--color-border)] flex flex-col shrink-0">
      <div className="px-3 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
        <span className="text-sm font-semibold text-[var(--color-text-primary)]">Activity</span>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-[var(--color-accent-red)] rounded-full animate-pulse" />
          <span className="text-xs text-[var(--color-accent-red)]">Live</span>
          <button onClick={() => setIsCollapsed(true)} className="ml-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
        {(events ?? []).map((evt) => {
          const color = getEventColor(evt.confidence)
          return (
            <div key={evt.id} className="rounded-lg p-2 text-xs" style={{ backgroundColor: `color-mix(in srgb, ${color} 8%, transparent)`, borderLeft: `3px solid ${color}` }}>
              <div className="flex justify-between items-center">
                <span className="font-semibold" style={{ color }}>{evt.operatorName}</span>
                <span className="text-[var(--color-text-muted)] text-[10px]">{timeAgo(evt.createdAt)}</span>
              </div>
              <div className="text-[var(--color-text-secondary)] mt-1">
                Submitted <strong className="text-[var(--color-text-primary)]">{evt.assetName}</strong>
              </div>
              <div className="text-[var(--color-text-muted)] mt-0.5">
                {evt.category}{evt.confidence !== null && <> · <ConfidenceBadge value={evt.confidence} /></>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create shared components**

Create `dashboard/src/components/KPICard.tsx`:

```tsx
interface KPICardProps {
  label: string
  value: string | number
  subtitle?: string
  delta?: string
  deltaColor?: string
  highlight?: boolean
  highlightColor?: string
  onClick?: () => void
}

export function KPICard({ label, value, subtitle, delta, deltaColor, highlight, highlightColor = 'var(--color-accent-amber)', onClick }: KPICardProps) {
  return (
    <div
      className={`flex-1 rounded-xl p-3 border cursor-default ${highlight ? '' : 'bg-[var(--color-surface-card)] border-white/[0.04]'}`}
      style={highlight ? { background: `linear-gradient(135deg, color-mix(in srgb, ${highlightColor} 12%, transparent), color-mix(in srgb, ${highlightColor} 4%, transparent))`, borderColor: `color-mix(in srgb, ${highlightColor} 20%, transparent)` } : undefined}
      onClick={onClick}
    >
      <div className="flex justify-between items-center">
        <span className="text-[10px] text-[var(--color-text-secondary)] uppercase tracking-wider">{label}</span>
        {delta && <span className="text-[10px]" style={{ color: deltaColor }}>{delta}</span>}
      </div>
      <div className="text-2xl font-extrabold text-[var(--color-text-primary)] mt-0.5">{value}</div>
      {subtitle && <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{subtitle}</div>}
    </div>
  )
}
```

Create `dashboard/src/components/StatusBadge.tsx`:

```tsx
const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  intake: { bg: 'rgba(16,185,129,0.15)', text: '#34D399', label: 'Intake' },
  needs_review: { bg: 'rgba(245,158,11,0.15)', text: '#FBBF24', label: 'Needs Review' },
  reviewed: { bg: 'rgba(59,130,246,0.15)', text: '#60A5FA', label: 'Reviewed' },
  approved: { bg: 'rgba(16,185,129,0.15)', text: '#10B981', label: 'Approved' },
}

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? { bg: 'rgba(148,163,184,0.15)', text: '#94A3B8', label: status }
  return (
    <span className="px-2 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: config.bg, color: config.text }}>
      {config.label}
    </span>
  )
}
```

Create `dashboard/src/components/ConfidenceBadge.tsx`:

```tsx
export function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const color = pct >= 80 ? 'var(--color-accent-green)' : pct >= 50 ? 'var(--color-accent-amber)' : 'var(--color-accent-red)'
  return <span className="font-semibold" style={{ color }}>{pct}%</span>
}
```

Create `dashboard/src/components/PeriodToggle.tsx`:

```tsx
import type { Period } from '@/api/types'

const options: { value: Period; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
]

export function PeriodToggle({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <div className="flex gap-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`text-xs px-2.5 py-1 rounded-md transition-colors ${value === opt.value ? 'bg-[var(--color-surface-card)] text-[var(--color-text-primary)] border border-white/[0.08]' : 'text-[var(--color-text-muted)] bg-[var(--color-surface-primary)]'}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Create Shell layout**

Create `dashboard/src/components/Shell.tsx`:

```tsx
import { Sidebar } from './Sidebar'
import { ActivityStream } from './ActivityStream'

interface ShellProps {
  children: React.ReactNode
  activityCollapsed?: boolean
}

export function Shell({ children, activityCollapsed = false }: ShellProps) {
  return (
    <div className="h-screen flex bg-slate-950 text-slate-100 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
      <ActivityStream collapsed={activityCollapsed} />
    </div>
  )
}
```

- [ ] **Step 6: Update root route to use Shell**

Update `dashboard/src/routes/__root.tsx`:

```tsx
import { createRootRoute, Outlet } from '@tanstack/react-router'
import { Shell } from '@/components/Shell'

export const Route = createRootRoute({
  component: () => (
    <Shell>
      <Outlet />
    </Shell>
  ),
})
```

- [ ] **Step 7: Verify shell renders**

Run: `cd dashboard && npx vite`
Expected: Sidebar renders on left with icons, activity stream on right (may show empty state), main content shows "Mater Dashboard".

- [ ] **Step 8: Commit**

```bash
git add dashboard/src/components/ dashboard/src/routes/__root.tsx
git commit -m "feat: add dashboard shell layout with sidebar, activity stream, and shared components"
```

---

## Task 8: Command Center Page

**Files:**
- Modify: `dashboard/src/routes/index.tsx`

- [ ] **Step 1: Build the Command Center page**

Replace `dashboard/src/routes/index.tsx`:

```tsx
import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useDashboardStats, useIntakeVolume, useCategoryBreakdown, useAssets, useOperatorStats } from '@/api/hooks'
import type { Period } from '@/api/types'
import { KPICard } from '@/components/KPICard'
import { PeriodToggle } from '@/components/PeriodToggle'
import { StatusBadge } from '@/components/StatusBadge'
import { ConfidenceBadge } from '@/components/ConfidenceBadge'

export const Route = createFileRoute('/')({
  component: CommandCenter,
})

function CommandCenter() {
  const [period, setPeriod] = useState<Period>('today')
  const navigate = useNavigate()
  const { data: stats } = useDashboardStats(period)
  const { data: volume } = useIntakeVolume(period)
  const { data: categories } = useCategoryBreakdown(period)
  const { data: assetsResult } = useAssets({ limit: 10 })
  const { data: operators } = useOperatorStats(period)

  const delta = stats && stats.intakeCountPrevious > 0
    ? Math.round(((stats.intakeCount - stats.intakeCountPrevious) / stats.intakeCountPrevious) * 100)
    : null

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-[var(--color-text-primary)]">Command Center</h1>
          <p className="text-[10px] text-[var(--color-text-muted)]">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <PeriodToggle value={period} onChange={setPeriod} />
      </div>

      {/* KPI Strip */}
      <div className="px-4 py-3 flex gap-2.5">
        <KPICard label="Today's Intakes" value={stats?.intakeCount ?? 0} delta={delta !== null ? `${delta > 0 ? '↑' : '↓'} ${Math.abs(delta)}%` : undefined} deltaColor={delta !== null && delta > 0 ? 'var(--color-accent-green)' : 'var(--color-accent-red)'} subtitle={`vs ${stats?.intakeCountPrevious ?? 0} previous`} />
        <KPICard label="Active Operators" value={`${stats?.activeOperators ?? 0} / ${stats?.totalOperators ?? 0}`} subtitle={`${(stats?.totalOperators ?? 0) - (stats?.activeOperators ?? 0)} idle > 30min`} />
        <KPICard label="Needs Review" value={stats?.needsReviewCount ?? 0} subtitle={`${stats?.needsReviewBreakdown?.lowConfidence ?? 0} low confidence · ${stats?.needsReviewBreakdown?.missingFields ?? 0} missing fields`} highlight highlightColor="var(--color-accent-amber)" onClick={() => navigate({ to: '/assets', search: { status: 'needs_review' } })} />
        <KPICard label="AI Confidence" value={`${Math.round((stats?.avgConfidence ?? 0) * 100)}%`} subtitle={`avg across ${stats?.intakeCount ?? 0} intakes`} />
      </div>

      {/* Main Grid */}
      <div className="flex-1 px-4 pb-4 flex gap-2.5 overflow-hidden">
        {/* Left: Chart + Table */}
        <div className="flex-[2] flex flex-col gap-2.5">
          {/* Intake Volume Chart */}
          <div className="bg-[var(--color-surface-card)] rounded-xl p-3.5 border border-white/[0.04]">
            <div className="text-xs font-semibold text-[var(--color-text-primary)] mb-2.5">Intake Volume</div>
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={volume ?? []}>
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} width={30} />
                <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }} />
                <Bar dataKey="count" fill="#3B82F6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Recent Intakes Table */}
          <div className="flex-1 bg-[var(--color-surface-card)] rounded-xl p-3.5 border border-white/[0.04] overflow-hidden">
            <div className="flex justify-between items-center mb-2.5">
              <span className="text-xs font-semibold text-[var(--color-text-primary)]">Recent Intakes</span>
              <button onClick={() => navigate({ to: '/assets' })} className="text-[10px] text-[var(--color-accent-blue)]">View all →</button>
            </div>
            <div className="overflow-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-[var(--color-text-muted)] uppercase text-[9px] tracking-wider border-b border-white/[0.04]">
                    <th className="text-left py-1.5 font-medium">Time</th>
                    <th className="text-left py-1.5 font-medium">Asset</th>
                    <th className="text-left py-1.5 font-medium">Category</th>
                    <th className="text-center py-1.5 font-medium">Confidence</th>
                    <th className="text-right py-1.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(assetsResult?.data ?? []).map((asset) => (
                    <tr key={asset.id} className="border-b border-white/[0.03] cursor-pointer hover:bg-white/[0.02]" onClick={() => navigate({ to: '/assets/$id', params: { id: asset.id } })}>
                      <td className="py-2 text-[var(--color-text-muted)]">{new Date(asset.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="py-2 font-medium text-[var(--color-text-primary)]">{[asset.make, asset.model].filter(Boolean).join(' ') || 'Unknown'}</td>
                      <td className="py-2"><span className="bg-[var(--color-accent-blue)]/15 text-[var(--color-accent-blue)] px-1.5 py-0.5 rounded text-[9px]">{asset.category ?? 'Unknown'}</span></td>
                      <td className="py-2 text-center">—</td>
                      <td className="py-2 text-right"><StatusBadge status={asset.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Categories + Top Operators */}
        <div className="flex-1 flex flex-col gap-2.5">
          {/* Category Breakdown */}
          <div className="bg-[var(--color-surface-card)] rounded-xl p-3.5 border border-white/[0.04]">
            <div className="text-xs font-semibold text-[var(--color-text-primary)] mb-2.5">By Category</div>
            <div className="flex flex-col gap-1.5">
              {(categories ?? []).slice(0, 5).map((cat) => (
                <div key={cat.category} className="flex items-center gap-2">
                  <span className="flex-1 text-[10px] text-[var(--color-text-secondary)]">{cat.category}</span>
                  <span className="text-[10px] text-[var(--color-text-primary)] font-semibold">{cat.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Operators */}
          <div className="flex-1 bg-[var(--color-surface-card)] rounded-xl p-3.5 border border-white/[0.04]">
            <div className="flex justify-between items-center mb-2.5">
              <span className="text-xs font-semibold text-[var(--color-text-primary)]">Top Operators</span>
              <button onClick={() => navigate({ to: '/operators' })} className="text-[10px] text-[var(--color-accent-blue)]">View all →</button>
            </div>
            <div className="flex flex-col gap-2">
              {(operators ?? []).slice(0, 5).map((op) => (
                <div key={op.id} className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-[var(--color-accent-blue)] rounded-full flex items-center justify-center text-[9px] text-white font-semibold">
                    {op.displayName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1">
                    <div className="text-[11px] text-[var(--color-text-primary)] font-medium">{op.displayName}</div>
                    <div className="text-[9px] text-[var(--color-text-muted)]">{op.intakeCount} intakes · avg <ConfidenceBadge value={op.avgConfidence} /></div>
                  </div>
                  <span className={`text-[9px] ${op.isActive ? 'text-[var(--color-accent-green)]' : 'text-[var(--color-text-muted)]'}`}>
                    {op.isActive ? '● Active' : '○ Idle'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify page renders**

Run: `cd dashboard && npx vite` (backend must be running on port 3000)
Expected: Command Center renders with KPI strip, chart, table, categories, and operators. Data may be empty if backend has no data.

- [ ] **Step 3: Commit**

```bash
git add dashboard/src/routes/index.tsx
git commit -m "feat: add Command Center page with KPIs, charts, and tables"
```

---

## Task 9: Asset Inventory Table Page

**Files:**
- Create: `dashboard/src/routes/assets/index.tsx`

- [ ] **Step 1: Create the assets route directory and index**

Create `dashboard/src/routes/assets/index.tsx`:

```tsx
import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAssets, useUpdateAsset } from '@/api/hooks'
import { StatusBadge } from '@/components/StatusBadge'
import { ConfidenceBadge } from '@/components/ConfidenceBadge'

interface AssetsSearch {
  status?: string
  category?: string
  search?: string
}

export const Route = createFileRoute('/assets/')({
  validateSearch: (search: Record<string, unknown>): AssetsSearch => ({
    status: search.status as string | undefined,
    category: search.category as string | undefined,
    search: search.search as string | undefined,
  }),
  component: AssetInventory,
})

const statuses = ['all', 'intake', 'needs_review', 'reviewed', 'approved'] as const

function AssetInventory() {
  const { status, category, search: searchParam } = Route.useSearch()
  const navigate = useNavigate()
  const [page, setPage] = useState(0)
  const [searchText, setSearchText] = useState(searchParam ?? '')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const limit = 20

  const activeStatus = status === 'all' || !status ? undefined : status
  const { data: result } = useAssets({ status: activeStatus, category, search: searchParam, limit, offset: page * limit })
  const updateAsset = useUpdateAsset()

  const assets = result?.data ?? []
  const total = result?.total ?? 0

  const handleBulkStatus = async (newStatus: string) => {
    for (const id of selected) {
      await updateAsset.mutateAsync({ id, updates: { status: newStatus } as any })
    }
    setSelected(new Set())
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--color-border)]">
        <h1 className="text-base font-bold text-[var(--color-text-primary)]">Assets</h1>
        <p className="text-[10px] text-[var(--color-text-muted)]">{total} total</p>
      </div>

      {/* Filters */}
      <div className="px-4 py-2 flex items-center gap-3 border-b border-[var(--color-border)]">
        <div className="flex gap-1">
          {statuses.map((s) => (
            <button key={s} onClick={() => navigate({ search: { status: s === 'all' ? undefined : s, category, search: searchParam } })} className={`text-[10px] px-2.5 py-1 rounded-md ${(s === 'all' && !status) || status === s ? 'bg-[var(--color-surface-card)] text-[var(--color-text-primary)] border border-white/[0.08]' : 'text-[var(--color-text-muted)]'}`}>
              {s === 'all' ? 'All' : s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </button>
          ))}
        </div>
        <input
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && navigate({ search: { status, category, search: searchText || undefined } })}
          placeholder="Search VIN, make, model..."
          className="text-xs bg-[var(--color-surface-input)] border border-white/[0.08] rounded-md px-2.5 py-1.5 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] w-64"
        />
        {selected.size > 0 && (
          <div className="flex gap-1 ml-auto">
            <button onClick={() => handleBulkStatus('reviewed')} className="text-[10px] bg-[var(--color-accent-blue)]/10 text-[var(--color-accent-blue)] px-2.5 py-1 rounded-md border border-[var(--color-accent-blue)]/20">Mark Reviewed ({selected.size})</button>
            <button onClick={() => handleBulkStatus('approved')} className="text-[10px] bg-[var(--color-accent-green)]/10 text-[var(--color-accent-green)] px-2.5 py-1 rounded-md border border-[var(--color-accent-green)]/20">Approve ({selected.size})</button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-4">
        <table className="w-full text-[11px]">
          <thead className="sticky top-0 bg-slate-950">
            <tr className="text-[var(--color-text-muted)] uppercase text-[9px] tracking-wider border-b border-white/[0.04]">
              <th className="py-2 w-8"><input type="checkbox" onChange={(e) => setSelected(e.target.checked ? new Set(assets.map(a => a.id)) : new Set())} /></th>
              <th className="text-left py-2 font-medium">Asset</th>
              <th className="text-left py-2 font-medium">Year</th>
              <th className="text-left py-2 font-medium">Category</th>
              <th className="text-left py-2 font-medium">VIN/Serial</th>
              <th className="text-right py-2 font-medium">Status</th>
              <th className="text-right py-2 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((asset) => (
              <tr key={asset.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] cursor-pointer" onClick={() => navigate({ to: '/assets/$id', params: { id: asset.id } })}>
                <td className="py-2" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={selected.has(asset.id)} onChange={(e) => { const next = new Set(selected); e.target.checked ? next.add(asset.id) : next.delete(asset.id); setSelected(next) }} />
                </td>
                <td className="py-2 font-medium text-[var(--color-text-primary)]">{[asset.make, asset.model].filter(Boolean).join(' ') || 'Unknown'}</td>
                <td className="py-2 text-[var(--color-text-secondary)]">{asset.year ?? '—'}</td>
                <td className="py-2"><span className="bg-[var(--color-accent-blue)]/15 text-[var(--color-accent-blue)] px-1.5 py-0.5 rounded text-[9px]">{asset.category ?? 'Unknown'}</span></td>
                <td className="py-2 text-[var(--color-text-muted)] font-mono text-[10px]">{asset.vin_serial ?? '—'}</td>
                <td className="py-2 text-right"><StatusBadge status={asset.status} /></td>
                <td className="py-2 text-right text-[var(--color-text-muted)]">{new Date(asset.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-4 py-2 border-t border-[var(--color-border)] flex justify-between items-center text-[10px] text-[var(--color-text-muted)]">
        <span>Showing {page * limit + 1}–{Math.min((page + 1) * limit, total)} of {total}</span>
        <div className="flex gap-1">
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="px-2 py-1 rounded bg-[var(--color-surface-card)] disabled:opacity-30">← Prev</button>
          <button disabled={(page + 1) * limit >= total} onClick={() => setPage(p => p + 1)} className="px-2 py-1 rounded bg-[var(--color-surface-card)] disabled:opacity-30">Next →</button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify and commit**

Run: `cd dashboard && npx vite` — navigate to `/assets`
Expected: Table renders with status tabs, search, pagination, bulk actions.

```bash
git add dashboard/src/routes/assets/
git commit -m "feat: add Asset Inventory table page with filters and bulk actions"
```

---

## Task 10: Asset Detail Page

**Files:**
- Create: `dashboard/src/routes/assets/$id.tsx`

- [ ] **Step 1: Create the asset detail route**

Create `dashboard/src/routes/assets/$id.tsx`:

```tsx
import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAsset, useIntakeEvents, useUpdateAsset } from '@/api/hooks'
import { StatusBadge } from '@/components/StatusBadge'
import { ConfidenceBadge } from '@/components/ConfidenceBadge'

export const Route = createFileRoute('/assets/$id')({
  component: AssetDetail,
})

function AssetDetail() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const { data: asset } = useAsset(id)
  const { data: events } = useIntakeEvents(id)
  const updateAsset = useUpdateAsset()
  const [editing, setEditing] = useState(false)
  const [editData, setEditData] = useState<Record<string, unknown>>({})

  if (!asset) return <div className="p-4 text-[var(--color-text-muted)]">Loading...</div>

  const handleSave = async () => {
    await updateAsset.mutateAsync({ id, updates: editData as any })
    setEditing(false)
    setEditData({})
  }

  const heroPhoto = asset.photos[0]
  const otherPhotos = asset.photos.slice(1)

  const aiTax = events?.[0]?.ai_taxonomy_result as Record<string, unknown> | null | undefined
  const taxData = aiTax?.taxonomy as Record<string, unknown> | undefined
  const confidence = typeof taxData?.confidence === 'number' ? taxData.confidence : null

  const coreSpecs = [
    { label: 'Make', value: asset.make },
    { label: 'Model', value: asset.model },
    { label: 'Year', value: asset.year },
    { label: 'Engine', value: asset.engine_type },
    { label: 'GVW', value: asset.gvw_lbs ? `${asset.gvw_lbs.toLocaleString()} lbs` : null },
    { label: 'Hours', value: asset.hours_on_meter?.toLocaleString() },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate({ to: '/assets' })} className="text-[10px] text-[var(--color-accent-blue)]">← Assets</button>
          <span className="text-[10px] text-[var(--color-text-muted)]">/</span>
          <h1 className="text-sm font-bold text-[var(--color-text-primary)]">{[asset.make, asset.model].filter(Boolean).join(' ') || 'Unknown Asset'}</h1>
          <StatusBadge status={asset.status} />
        </div>
        <div className="flex gap-1.5">
          {!editing && (
            <>
              <button onClick={() => updateAsset.mutate({ id, updates: { status: 'needs_review' } as any })} className="text-[10px] text-[var(--color-accent-amber)] bg-[var(--color-accent-amber)]/10 px-3 py-1.5 rounded-md border border-[var(--color-accent-amber)]/20">Flag for Review</button>
              <button onClick={() => { setEditing(true); setEditData({ make: asset.make, model: asset.model, year: asset.year, engine_type: asset.engine_type, gvw_lbs: asset.gvw_lbs, hours_on_meter: asset.hours_on_meter, lot_number: asset.lot_number, yard_location: asset.yard_location, consignor: asset.consignor }) }} className="text-[10px] text-[var(--color-text-primary)] bg-[var(--color-accent-blue)] px-3 py-1.5 rounded-md">Edit Asset</button>
              <button onClick={() => updateAsset.mutate({ id, updates: { status: 'approved' } as any })} className="text-[10px] text-[var(--color-accent-green)] bg-[var(--color-accent-green)]/10 px-3 py-1.5 rounded-md border border-[var(--color-accent-green)]/20">Approve ✓</button>
            </>
          )}
          {editing && (
            <>
              <button onClick={() => setEditing(false)} className="text-[10px] text-[var(--color-text-muted)] px-3 py-1.5 rounded-md border border-white/[0.08]">Cancel</button>
              <button onClick={handleSave} className="text-[10px] text-white bg-[var(--color-accent-blue)] px-3 py-1.5 rounded-md">Save</button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 flex gap-4">
        {/* Left: Photos + Specs */}
        <div className="flex-[3] flex flex-col gap-3">
          {/* Photo Gallery */}
          <div className="bg-[var(--color-surface-card)] rounded-xl p-3.5 border border-white/[0.04]">
            <div className="text-xs font-semibold text-[var(--color-text-primary)] mb-2.5">Photos <span className="text-[var(--color-text-muted)] font-normal">({asset.photos.length})</span></div>
            <div className="flex gap-2">
              {heroPhoto && (
                <div className="flex-[2] bg-[var(--color-surface-primary)] rounded-lg h-40 flex items-center justify-center border-2 border-[var(--color-accent-blue)] relative overflow-hidden">
                  <img src={heroPhoto.url} alt={heroPhoto.label} className="w-full h-full object-cover" />
                  <span className="absolute top-1.5 left-1.5 bg-[var(--color-accent-blue)] text-white px-1.5 py-0.5 rounded text-[8px]">Hero</span>
                </div>
              )}
              <div className="flex-[3] flex flex-wrap gap-1">
                {otherPhotos.map((photo, i) => (
                  <div key={i} className="w-[calc(33.33%-3px)] bg-[var(--color-surface-primary)] rounded-md h-[52px] relative overflow-hidden">
                    <img src={photo.url} alt={photo.label} className="w-full h-full object-cover" />
                    <span className="absolute bottom-0.5 left-1 text-[7px] text-[var(--color-text-secondary)]">{photo.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Core Specs */}
          <div className="bg-[var(--color-surface-card)] rounded-xl p-3.5 border border-white/[0.04]">
            <div className="flex justify-between items-center mb-2.5">
              <span className="text-xs font-semibold text-[var(--color-text-primary)]">Core Specifications</span>
              {confidence !== null && <span className="text-[9px] text-[var(--color-accent-purple)] bg-[var(--color-accent-purple)]/10 px-2 py-0.5 rounded">🤖 AI Extracted · <ConfidenceBadge value={confidence} /></span>}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {coreSpecs.map(({ label, value }) => (
                <div key={label} className="bg-[var(--color-surface-primary)] rounded-lg p-2.5">
                  <div className="text-[8px] text-[var(--color-text-muted)] uppercase tracking-wider">{label}</div>
                  {editing ? (
                    <input value={String(editData[label.toLowerCase()] ?? value ?? '')} onChange={(e) => setEditData({ ...editData, [label.toLowerCase()]: e.target.value })} className="text-xs text-[var(--color-text-primary)] bg-transparent border-b border-white/[0.1] w-full mt-1 outline-none" />
                  ) : (
                    <div className="text-xs text-[var(--color-text-primary)] font-medium mt-0.5">{value ?? '—'}</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Type-Specific Specs */}
          {Object.keys(asset.type_specific_specs).length > 0 && (
            <div className="bg-[var(--color-surface-card)] rounded-xl p-3.5 border border-white/[0.04]">
              <div className="text-xs font-semibold text-[var(--color-text-primary)] mb-2.5">Type-Specific Specs</div>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(asset.type_specific_specs).map(([key, value]) => (
                  <div key={key} className="bg-[var(--color-surface-primary)] rounded-lg p-2.5">
                    <div className="text-[8px] text-[var(--color-text-muted)] uppercase">{key}</div>
                    <div className="text-xs text-[var(--color-text-primary)] mt-0.5">{String(value ?? '—')}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Meta + Timeline */}
        <div className="flex-[2] flex flex-col gap-3">
          {/* Classification */}
          <div className="bg-[var(--color-surface-card)] rounded-xl p-3.5 border border-white/[0.04]">
            <div className="text-xs font-semibold text-[var(--color-text-primary)] mb-2.5">Classification</div>
            <div className="flex gap-1.5 items-center mb-2">
              {[asset.category, asset.type, asset.subtype].filter(Boolean).map((val, i) => (
                <span key={i}>
                  {i > 0 && <span className="text-[var(--color-text-muted)] mr-1.5">→</span>}
                  <span className="bg-[var(--color-accent-blue)]/15 text-[var(--color-accent-blue)] px-2 py-0.5 rounded text-[10px]">{val}</span>
                </span>
              ))}
            </div>
            {confidence !== null && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-[var(--color-text-muted)]">AI Confidence:</span>
                <div className="flex-1 h-1.5 bg-[var(--color-surface-primary)] rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${confidence * 100}%`, backgroundColor: confidence >= 0.8 ? 'var(--color-accent-green)' : confidence >= 0.5 ? 'var(--color-accent-amber)' : 'var(--color-accent-red)' }} />
                </div>
                <ConfidenceBadge value={confidence} />
              </div>
            )}
          </div>

          {/* VIN */}
          <div className="bg-[var(--color-surface-card)] rounded-xl p-3.5 border border-white/[0.04]">
            <div className="text-xs font-semibold text-[var(--color-text-primary)] mb-2">Identification</div>
            <div className="bg-[var(--color-surface-primary)] rounded-lg p-2.5">
              <div className="text-[8px] text-[var(--color-text-muted)] uppercase">VIN / Serial</div>
              <div className="text-sm text-[var(--color-text-primary)] font-medium font-mono mt-0.5">{asset.vin_serial ?? '—'}</div>
            </div>
          </div>

          {/* Yard Info */}
          <div className="bg-[var(--color-surface-card)] rounded-xl p-3.5 border border-white/[0.04]">
            <div className="text-xs font-semibold text-[var(--color-text-primary)] mb-2">Yard Info</div>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="bg-[var(--color-surface-primary)] rounded-lg p-2">
                <div className="text-[8px] text-[var(--color-text-muted)]">Lot #</div>
                <div className="text-xs text-[var(--color-text-primary)] mt-0.5">{editing ? <input value={String(editData.lot_number ?? asset.lot_number ?? '')} onChange={(e) => setEditData({ ...editData, lot_number: e.target.value })} className="bg-transparent border-b border-white/[0.1] w-full outline-none" /> : (asset.lot_number ?? '—')}</div>
              </div>
              <div className="bg-[var(--color-surface-primary)] rounded-lg p-2">
                <div className="text-[8px] text-[var(--color-text-muted)]">Location</div>
                <div className="text-xs text-[var(--color-text-primary)] mt-0.5">{editing ? <input value={String(editData.yard_location ?? asset.yard_location ?? '')} onChange={(e) => setEditData({ ...editData, yard_location: e.target.value })} className="bg-transparent border-b border-white/[0.1] w-full outline-none" /> : (asset.yard_location ?? '—')}</div>
              </div>
              <div className="bg-[var(--color-surface-primary)] rounded-lg p-2 col-span-2">
                <div className="text-[8px] text-[var(--color-text-muted)]">Consignor</div>
                <div className="text-xs text-[var(--color-text-primary)] mt-0.5">{editing ? <input value={String(editData.consignor ?? asset.consignor ?? '')} onChange={(e) => setEditData({ ...editData, consignor: e.target.value })} className="bg-transparent border-b border-white/[0.1] w-full outline-none" /> : (asset.consignor ?? '—')}</div>
              </div>
            </div>
          </div>

          {/* Intake Timeline */}
          <div className="bg-[var(--color-surface-card)] rounded-xl p-3.5 border border-white/[0.04]">
            <div className="text-xs font-semibold text-[var(--color-text-primary)] mb-2.5">Intake History</div>
            <div className="flex flex-col gap-0 relative pl-4">
              <div className="absolute left-[5px] top-1.5 bottom-1.5 w-px bg-white/[0.08]" />
              {(events ?? []).map((evt) => (
                <div key={evt.id} className="relative pb-3">
                  <div className="absolute left-[-13px] top-1 w-2 h-2 bg-[var(--color-accent-blue)] rounded-full border-2 border-[var(--color-surface-card)]" />
                  <div className="text-[9px] text-[var(--color-text-muted)]">{new Date(evt.created_at).toLocaleString()}</div>
                  <div className="text-[10px] text-[var(--color-text-primary)] mt-0.5">Submitted by <strong>{evt.operator_name ?? 'Unknown'}</strong></div>
                  {evt.gps_lat && <div className="text-[9px] text-[var(--color-text-muted)] mt-0.5">📍 {evt.gps_lat}°, {evt.gps_lon}°</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify and commit**

Run: `cd dashboard && npx vite` — navigate to `/assets/<some-id>`

```bash
git add dashboard/src/routes/assets/\$id.tsx
git commit -m "feat: add Asset Detail page with photos, specs, timeline, and edit mode"
```

---

## Task 11: Operator Leaderboard Page

**Files:**
- Create: `dashboard/src/routes/operators.tsx`

- [ ] **Step 1: Create the operators page**

Create `dashboard/src/routes/operators.tsx`:

```tsx
import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useOperatorStats } from '@/api/hooks'
import type { Period } from '@/api/types'
import { KPICard } from '@/components/KPICard'
import { PeriodToggle } from '@/components/PeriodToggle'
import { ConfidenceBadge } from '@/components/ConfidenceBadge'

export const Route = createFileRoute('/operators')({
  component: Operators,
})

const avatarColors = ['#3B82F6', '#8B5CF6', '#F59E0B', '#EC4899', '#10B981', '#EF4444', '#06B6D4', '#84CC16']

function Operators() {
  const [period, setPeriod] = useState<Period>('today')
  const navigate = useNavigate()
  const { data: operators } = useOperatorStats(period)

  const ops = operators ?? []
  const totalIntakes = ops.reduce((s, o) => s + o.intakeCount, 0)
  const avgConf = ops.length > 0 ? ops.reduce((s, o) => s + o.avgConfidence, 0) / ops.length : 0
  const totalFlagged = ops.reduce((s, o) => s + o.flaggedCount, 0)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-[var(--color-text-primary)]">Operators</h1>
          <p className="text-[10px] text-[var(--color-text-muted)]">{ops.length} registered · {ops.filter(o => o.isActive).length} active</p>
        </div>
        <PeriodToggle value={period} onChange={setPeriod} />
      </div>

      {/* KPIs */}
      <div className="px-4 py-3 flex gap-2.5">
        <KPICard label="Total Intakes" value={totalIntakes} />
        <KPICard label="Avg per Operator" value={ops.length > 0 ? (totalIntakes / ops.length).toFixed(1) : '0'} />
        <KPICard label="Avg Confidence" value={`${Math.round(avgConf * 100)}%`} />
        <KPICard label="Review Rate" value={`${totalIntakes > 0 ? Math.round((totalFlagged / totalIntakes) * 100) : 0}%`} subtitle={`${totalFlagged} of ${totalIntakes} flagged`} />
      </div>

      {/* Operator Cards */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-2">
        {ops.map((op, idx) => {
          const flagRate = op.intakeCount > 0 ? op.flaggedCount / op.intakeCount : 0
          const isHighFlagRate = flagRate > 0.4
          const color = avatarColors[idx % avatarColors.length]
          const initials = op.displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

          return (
            <div
              key={op.id}
              onClick={() => navigate({ to: '/assets', search: { userId: op.id } as any })}
              className={`rounded-xl p-3.5 flex items-center gap-3.5 cursor-pointer ${isHighFlagRate ? 'border border-[var(--color-accent-red)]/15' : 'bg-[var(--color-surface-card)] border border-white/[0.04]'}`}
              style={isHighFlagRate ? { background: `linear-gradient(135deg, rgba(239,68,68,0.06), var(--color-surface-card))` } : undefined}
            >
              <div className="relative">
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm text-white font-semibold" style={{ backgroundColor: color }}>
                  {initials}
                </div>
                <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[var(--color-surface-card)] ${op.isActive ? 'bg-[var(--color-accent-green)]' : 'bg-[var(--color-text-muted)]'}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-[var(--color-text-primary)]">{op.displayName}</span>
                  {idx === 0 && <span className="text-[8px] text-[var(--color-accent-amber)] bg-[var(--color-accent-amber)]/10 px-1.5 py-0.5 rounded">🏆 #1</span>}
                  {idx > 0 && <span className="text-[8px] text-[var(--color-text-secondary)] bg-[var(--color-text-secondary)]/10 px-1.5 py-0.5 rounded">#{idx + 1}</span>}
                  <span className={`text-[8px] ${op.isActive ? 'text-[var(--color-accent-green)]' : 'text-[var(--color-text-muted)]'}`}>
                    {op.isActive ? '● Active now' : `○ Idle`}
                  </span>
                  {isHighFlagRate && <span className="text-[8px] text-[var(--color-accent-red)] bg-[var(--color-accent-red)]/10 px-1.5 py-0.5 rounded">⚠️ High flag rate</span>}
                </div>
                <div className="text-[9px] text-[var(--color-text-muted)] mt-0.5">{op.email}{op.lastIntakeAt && <> · Last intake {new Date(op.lastIntakeAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</>}</div>
              </div>
              <div className="flex gap-4 items-center">
                <div className="text-center"><div className="text-xl font-bold text-[var(--color-text-primary)]">{op.intakeCount}</div><div className="text-[8px] text-[var(--color-text-muted)]">intakes</div></div>
                <div className="text-center"><div className="text-xl font-bold"><ConfidenceBadge value={op.avgConfidence} /></div><div className="text-[8px] text-[var(--color-text-muted)]">avg conf.</div></div>
                <div className="text-center"><div className="text-xl font-bold" style={{ color: op.flaggedCount > 0 ? 'var(--color-accent-amber)' : 'var(--color-text-primary)' }}>{op.flaggedCount}</div><div className="text-[8px] text-[var(--color-text-muted)]">flagged</div></div>
                <div className="w-28">
                  <div className="flex justify-between text-[8px] text-[var(--color-text-muted)] mb-1"><span>Volume</span><span>{op.intakeCount} / {totalIntakes}</span></div>
                  <div className="h-1.5 bg-[var(--color-surface-primary)] rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${totalIntakes > 0 ? (op.intakeCount / totalIntakes) * 100 : 0}%`, backgroundColor: color }} /></div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify and commit**

Run: `cd dashboard && npx vite` — navigate to `/operators`

```bash
git add dashboard/src/routes/operators.tsx
git commit -m "feat: add Operator Leaderboard page with ranked cards and stats"
```

---

## Task 12: AI Insights Page

**Files:**
- Create: `dashboard/src/routes/ai-insights.tsx`

- [ ] **Step 1: Create the AI insights page**

Create `dashboard/src/routes/ai-insights.tsx`:

```tsx
import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useAiInsights } from '@/api/hooks'
import type { Period } from '@/api/types'
import { KPICard } from '@/components/KPICard'
import { PeriodToggle } from '@/components/PeriodToggle'

export const Route = createFileRoute('/ai-insights')({
  component: AiInsights,
})

const bucketColors: Record<string, string> = {
  '0-20': '#EF4444', '20-40': '#EF4444', '40-60': '#F59E0B', '60-80': '#F59E0B', '80-100': '#10B981',
}

function AiInsights() {
  const [period, setPeriod] = useState<Period>('week')
  const { data: insights } = useAiInsights(period)

  if (!insights) return <div className="p-4 text-[var(--color-text-muted)]">Loading...</div>

  const vinTotal = insights.vinSources.nhtsa + insights.vinSources.claude + insights.vinSources.none

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-[var(--color-text-primary)]">AI Insights</h1>
          <p className="text-[10px] text-[var(--color-text-muted)]">Classification & spec extraction performance</p>
        </div>
        <PeriodToggle value={period} onChange={setPeriod} />
      </div>

      {/* KPIs */}
      <div className="px-4 py-3 flex gap-2.5">
        <KPICard label="Avg Classification Confidence" value={`${Math.round(insights.avgClassificationConfidence * 100)}%`} />
        <KPICard label="Avg Spec Confidence" value={`${Math.round(insights.avgSpecConfidence * 100)}%`} />
        <KPICard label="Override Rate" value={`${Math.round(insights.overrideRate * 100)}%`} />
        <KPICard label="VIN Match Rate" value={`${Math.round(insights.vinMatchRate * 100)}%`} />
      </div>

      {/* Charts */}
      <div className="flex-1 px-4 pb-4 flex gap-3 overflow-hidden">
        {/* Left Column */}
        <div className="flex-[3] flex flex-col gap-3">
          {/* Confidence Trend */}
          <div className="bg-[var(--color-surface-card)] rounded-xl p-3.5 border border-white/[0.04]">
            <div className="text-xs font-semibold text-[var(--color-text-primary)] mb-3">Confidence Trend</div>
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={insights.confidenceTrend}>
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#475569' }} axisLine={false} tickLine={false} tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { weekday: 'short' })} />
                <YAxis tick={{ fontSize: 9, fill: '#475569' }} axisLine={false} tickLine={false} domain={[0.5, 1]} tickFormatter={(v) => `${Math.round(v * 100)}%`} width={35} />
                <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }} formatter={(v: number) => `${Math.round(v * 100)}%`} />
                <Line type="monotone" dataKey="classification" stroke="#10B981" strokeWidth={2} dot={false} name="Classification" />
                <Line type="monotone" dataKey="spec" stroke="#3B82F6" strokeWidth={2} dot={false} strokeDasharray="4 3" name="Spec Extraction" />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-1 pl-9">
              <div className="flex items-center gap-1"><div className="w-3 h-0.5 bg-[var(--color-accent-green)]" /><span className="text-[8px] text-[var(--color-text-secondary)]">Classification</span></div>
              <div className="flex items-center gap-1"><div className="w-3 h-0.5 bg-[var(--color-accent-blue)]" style={{ borderTop: '1px dashed var(--color-accent-blue)' }} /><span className="text-[8px] text-[var(--color-text-secondary)]">Spec Extraction</span></div>
            </div>
          </div>

          {/* Confidence Distribution */}
          <div className="bg-[var(--color-surface-card)] rounded-xl p-3.5 border border-white/[0.04]">
            <div className="text-xs font-semibold text-[var(--color-text-primary)] mb-3">Confidence Distribution</div>
            <ResponsiveContainer width="100%" height={90}>
              <BarChart data={insights.confidenceDistribution}>
                <XAxis dataKey="bucket" tick={{ fontSize: 9, fill: '#475569' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#475569' }} axisLine={false} tickLine={false} width={30} />
                <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }} />
                <Bar dataKey="count" radius={[3, 3, 0, 0]} fill="#3B82F6">
                  {insights.confidenceDistribution.map((entry, i) => (
                    <rect key={i} fill={bucketColors[entry.bucket] ?? '#3B82F6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Misclassifications */}
          <div className="flex-1 bg-[var(--color-surface-card)] rounded-xl p-3.5 border border-white/[0.04] overflow-auto">
            <div className="text-xs font-semibold text-[var(--color-text-primary)] mb-2.5">Common Misclassifications</div>
            <div className="flex flex-col gap-1.5">
              {insights.misclassifications.slice(0, 5).map((m, i) => (
                <div key={i} className="flex items-center gap-2 bg-[var(--color-surface-primary)] rounded-lg p-2 text-[10px]">
                  <span className="text-[var(--color-accent-red)] font-semibold w-6">{m.count}×</span>
                  <span className="text-[var(--color-text-secondary)]">AI said</span>
                  <span className="bg-[var(--color-accent-blue)]/15 text-[var(--color-accent-blue)] px-1.5 py-0.5 rounded text-[9px]">{m.aiCategory}</span>
                  <span className="text-[var(--color-text-muted)]">→ was</span>
                  <span className="bg-[var(--color-accent-amber)]/15 text-[var(--color-accent-amber)] px-1.5 py-0.5 rounded text-[9px]">{m.actualCategory}</span>
                </div>
              ))}
              {insights.misclassifications.length === 0 && <div className="text-[10px] text-[var(--color-text-muted)]">No misclassifications in this period</div>}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="flex-[2] flex flex-col gap-3">
          {/* Accuracy by Category */}
          <div className="bg-[var(--color-surface-card)] rounded-xl p-3.5 border border-white/[0.04]">
            <div className="text-xs font-semibold text-[var(--color-text-primary)] mb-2.5">Accuracy by Category</div>
            <div className="flex flex-col gap-2">
              {insights.categoryAccuracy.map((cat) => {
                const pct = Math.round(cat.avgConfidence * 100)
                const color = pct >= 80 ? 'var(--color-accent-green)' : pct >= 60 ? 'var(--color-accent-amber)' : 'var(--color-accent-red)'
                return (
                  <div key={cat.category}>
                    <div className="flex justify-between text-[10px] mb-1"><span className="text-[var(--color-text-secondary)]">{cat.category}</span><span className="font-semibold" style={{ color }}>{pct}%</span></div>
                    <div className="h-1.5 bg-[var(--color-surface-primary)] rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} /></div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* AI vs VIN Agreement */}
          <div className="bg-[var(--color-surface-card)] rounded-xl p-3.5 border border-white/[0.04]">
            <div className="text-xs font-semibold text-[var(--color-text-primary)] mb-2.5">AI vs VIN Agreement</div>
            <div className="flex flex-col gap-1.5">
              {Object.entries(insights.vinAgreement).map(([field, rate]) => {
                const pct = Math.round(rate * 100)
                const color = pct >= 80 ? 'var(--color-accent-green)' : 'var(--color-accent-amber)'
                const label = field.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())
                return (
                  <div key={field}>
                    <div className="flex justify-between text-[10px] mb-1"><span className="text-[var(--color-text-secondary)]">{label}</span><span style={{ color }}>{pct}% match</span></div>
                    <div className="h-1 bg-[var(--color-surface-primary)] rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} /></div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* VIN Sources */}
          <div className="flex-1 bg-[var(--color-surface-card)] rounded-xl p-3.5 border border-white/[0.04]">
            <div className="text-xs font-semibold text-[var(--color-text-primary)] mb-2.5">VIN Lookup Sources</div>
            <div className="flex gap-3 items-center mb-2">
              <div className="text-center flex-1"><div className="text-2xl font-bold text-[var(--color-accent-green)]">{Math.round(insights.vinSources.nhtsa * 100)}%</div><div className="text-[9px] text-[var(--color-text-muted)]">NHTSA</div></div>
              <div className="text-center flex-1"><div className="text-2xl font-bold text-[var(--color-accent-purple)]">{Math.round(insights.vinSources.claude * 100)}%</div><div className="text-[9px] text-[var(--color-text-muted)]">Claude</div></div>
              <div className="text-center flex-1"><div className="text-2xl font-bold text-[var(--color-text-muted)]">{Math.round(insights.vinSources.none * 100)}%</div><div className="text-[9px] text-[var(--color-text-muted)]">No VIN</div></div>
            </div>
            <div className="h-2 flex rounded-full overflow-hidden">
              <div style={{ width: `${insights.vinSources.nhtsa * 100}%` }} className="bg-[var(--color-accent-green)]" />
              <div style={{ width: `${insights.vinSources.claude * 100}%` }} className="bg-[var(--color-accent-purple)]" />
              <div style={{ width: `${insights.vinSources.none * 100}%` }} className="bg-slate-700" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify and commit**

Run: `cd dashboard && npx vite` — navigate to `/ai-insights`

```bash
git add dashboard/src/routes/ai-insights.tsx
git commit -m "feat: add AI Insights page with confidence trends, distribution, and accuracy"
```

---

## Verification

After all tasks are complete, verify end-to-end:

- [ ] **Backend tests pass**: `cd backend && npm test`
- [ ] **Backend starts**: `cd backend && npm run dev`
- [ ] **Dashboard starts**: `cd dashboard && npm run dev`
- [ ] **Navigate all routes**: `/`, `/assets`, `/assets/:id`, `/operators`, `/ai-insights`
- [ ] **Activity stream updates**: Wait 30s, verify data refreshes
- [ ] **Asset edit works**: Edit an asset from detail view, save, verify update persists
- [ ] **Status workflow**: Flag an asset for review, then approve it
- [ ] **Bulk actions**: Select multiple assets, mark as reviewed
