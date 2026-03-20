# Heavy Equipment Inspection App — POC Plan

## Context

Build a greenfield proof-of-concept that lets a field inspector use a mobile device to generate professional inspection reports for large commercial equipment (bulldozers, cranes, backhoes, etc.). The core innovation is dual-pipeline AI identification: Claude analyzes photos to extract make/model/specs, while a VIN/serial lookup provides independent data. Conflicts are surfaced side-by-side for the inspector to resolve. All data is editable before submission. Final output is a structured database record + PDF report.

This is a foundation for a real product, not a throwaway demo.

---

## Architecture Overview

```
Mobile (Expo) → Backend (Node/TS) → Claude API
                                  → NHTSA API (VIN)
                                  → Supabase (Postgres + Storage)
                                  → PDF generation
```

**Monorepo structure:**

```
/
├── mobile/          # Expo React Native app
└── backend/         # Node.js TypeScript API
```

---

## Mobile App (Expo + React Native)

### Tech Stack

- Expo SDK 51+
- React Navigation (stack navigator for wizard)
- `expo-camera` — photo capture (overview, VIN, detail shots)
- `expo-location` — GPS coordinates
- `@react-native-async-storage/async-storage` — local draft state
- Axios or fetch for API calls

### Wizard Flow (5 Steps)

**Step 1 — Overview Photo**

- Single camera capture for the "hero" equipment photo
- Labeled as `type: overview`

**Step 2 — VIN/Serial Photo**

- Camera capture of VIN plate
- Display OCR result immediately (Claude extracts VIN text from image)
- Show extracted VIN as editable text field
- Trigger NHTSA lookup → fallback to Claude if NHTSA returns no results

**Step 3 — Detail Photos**

- Free-capture multiple photos (hydraulics, undercarriage, cab, engine bay)
- Labeled `type: detail`
- "Analyze Photos" button → sends overview + all detail photos to Claude
- Claude returns structured JSON: `{ make, model, year, engine, transmission, gvw, confidence, conditionSummary }`

**Step 4 — Review & Resolve**

- Side-by-side comparison: `Image AI` column vs `VIN Lookup` column
- Conflicting fields highlighted in amber
- User taps any field to edit or pick a source
- Condition Assessment section:
  - Overall rating: Excellent / Good / Fair / Poor / Salvage
  - 4 sub-sections with rating + notes text area:
    - Engine / Powertrain
    - Hydraulic System
    - Undercarriage / Tracks / Tires
    - Cab / Controls / Electrical
  - AI Condition Summary card (from Claude's photo analysis) shown above form as reference
- Inspector info: name, GPS (auto-populated), timestamp

**Step 5 — Confirm & Submit**

- Summary card of all collected data
- "Submit Inspection" → POST to backend → returns inspection ID + PDF URL
- Share/download PDF button

### Local Draft State

- After each wizard step, persist current state to AsyncStorage key `inspection_draft`
- On app launch, check for existing draft → offer "Resume" or "Start New"

---

## Backend (Node.js + TypeScript)

### Tech Stack

- **Runtime:** Node.js with TypeScript (tsx for dev, tsc for build)
- **Framework:** Fastify (lightweight, fast, good schema validation)
- **Database + Storage:** Supabase (PostgreSQL + Supabase Storage)
- **AI:** `@anthropic-ai/sdk` — Claude `claude-sonnet-4-6`
- **VIN:** NHTSA public API (`https://vpic.nhtsa.dot.gov/api/`) + Claude fallback
- **PDF:** `pdfkit` — programmatic PDF generation with embedded images

### API Endpoints

```
POST /api/analyze/images
  Body: { images: [{ base64, type: 'overview'|'detail' }] }
  Returns: { make, model, year, engine, transmission, gvw, confidence, conditionSummary }

POST /api/analyze/vin
  Body: { vin: string }
  Returns: { make, model, year, engine, transmission, gvw, source: 'nhtsa'|'claude' }

POST /api/inspections
  Body: { equipmentData, conditionData, photos, inspectorInfo }
  Returns: { inspectionId, pdfUrl }

GET /api/inspections/:id
  Returns: full inspection record JSON
```

### Image Analysis Prompt (Claude)

Send all overview + detail images in a single multi-image message:

```
"You are analyzing photos of large commercial equipment for an inspection report.
Identify the equipment and return a JSON object with:
{ make, model, year, engineType, transmission, gvwLbs, hoursOnMeter,
  conditionSummary, confidenceScore }
Base conditionSummary on visible condition in the photos.
If a field cannot be determined, use null."
```

### VIN Lookup Logic

```typescript
async function lookupVin(vin: string) {
  const nhtsa = await fetchNHTSA(vin);
  if (nhtsa.Results?.[0]?.Make) return { ...nhtsa, source: "nhtsa" };
  // Fallback: ask Claude
  const claude = await askClaude(
    `Given VIN/serial "${vin}", identify make, model, year, engine type, transmission, GVW for heavy equipment. Return JSON.`,
  );
  return { ...claude, source: "claude" };
}
```

### PDF Report Structure (pdfkit)

1. Header: Company logo placeholder, "Equipment Inspection Report", date
2. Inspector info box: Name, date, GPS coordinates
3. Equipment Identity table: all spec fields with source indicators
4. Embedded photos: overview photo, then detail photos in grid
5. Condition Assessment: 2-column layout, each section with rating badge + notes
6. Signature block: Inspector signature line + date

### Supabase Schema

```sql
-- inspections table
id uuid primary key default gen_random_uuid()
created_at timestamptz default now()
inspector_name text
gps_lat float8
gps_lon float8
equipment_data jsonb        -- merged + resolved fields
condition_data jsonb        -- ratings + notes per section
ai_image_result jsonb       -- raw Claude image analysis response
vin_lookup_result jsonb     -- raw VIN lookup response
pdf_url text
photos jsonb[]              -- [{url, type}] stored in Supabase Storage

-- Supabase Storage bucket: inspection-photos
-- Path pattern: {inspectionId}/{type}-{timestamp}.jpg
```

---

## Key Design Decisions

| Decision                  | Choice                          | Rationale                                                           |
| ------------------------- | ------------------------------- | ------------------------------------------------------------------- |
| Image processing location | Backend                         | API keys never exposed to client                                    |
| Photo storage             | Supabase Storage                | Free tier, S3-compatible for future migration, same service as DB   |
| VIN lookup                | NHTSA → Claude fallback         | Free for standard VINs, AI handles heavy equipment serial formats   |
| Conflict display          | Side-by-side with source labels | Most transparent UX for inspector trust                             |
| PDF library               | pdfkit                          | Lightweight, no headless browser, sufficient for structured reports |
| Auth                      | None (API secret in env)        | POC speed; add Supabase Auth in v1                                  |
| Offline support           | Not in POC                      | Requires connectivity; avoids sync complexity                       |

---

## Data Flow: Conflict Resolution

```
Image AI result:   { make: "Caterpillar", model: "320",  year: 2019 }
VIN result:        { make: "Caterpillar", model: "323",  year: 2020 }

UI shows:
  Make:    [Caterpillar] ✓ (agreement)
  Model:   [320 (Image)] ⚡ [323 (VIN)] ← inspector picks
  Year:    [2019 (Image)] ⚡ [2020 (VIN)] ← inspector picks
```

---

## Verification Plan

1. **Image analysis:** Take photos of known equipment, verify Claude returns correct make/model JSON
2. **VIN lookup:** Test with a known NHTSA VIN, verify NHTSA path; test with a Caterpillar serial, verify Claude fallback
3. **Conflict UI:** Manually inject divergent AI/VIN results, verify side-by-side display and field selection
4. **Draft persistence:** Fill partial wizard, background the app, reopen, verify resume prompt
5. **End-to-end:** Complete full inspection → verify PDF downloads with all sections populated
6. **Supabase persistence:** After submission, query Supabase table directly to confirm record + photos stored

---

## Open Questions (Post-POC)

- Commercial VIN API (DataOne) for production heavy equipment coverage
- Multi-inspector auth (Supabase Auth + Row Level Security)
- Offline draft sync (WatermelonDB or SQLite + background sync)
- PDF white-labeling per client organization
- Signature capture (expo-signature-canvas)
