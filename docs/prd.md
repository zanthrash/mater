# PRD: Heavy Equipment Inspection App — POC

## Problem Statement

Field inspectors working for equipment inspection organizations currently lack a streamlined mobile tool for generating professional inspection reports on-site. Capturing equipment identity (make, model, year, specs) is error-prone and slow when done manually. Cross-referencing VIN/serial data against visual observations requires juggling multiple systems. The result is inconsistent reports, rework, and delays in delivering findings to stakeholders.

## Solution

A mobile-first inspection app (iOS/Android via Expo) backed by a Node.js API that uses a dual-pipeline AI approach to identify equipment: Claude analyzes photos to extract make/model/specs, while a VIN/serial number lookup provides an independent data source. Conflicts between the two pipelines are surfaced side-by-side for the inspector to resolve. All data is editable before submission. The final output is a structured database record and a downloadable PDF report.

## User Stories

1. As a field inspector, I want to launch the app and be prompted to resume a previous draft, so that I can pick up where I left off if interrupted.
2. As a field inspector, I want to start a new inspection from scratch, so that I can begin capturing equipment data on-site.
3. As a field inspector, I want to take an overview photo of the equipment using my phone camera, so that I have a hero image for the inspection report.
4. As a field inspector, I want the overview photo to be automatically resized on-device before upload, so that my bandwidth usage is minimized without sacrificing AI analysis quality.
5. As a field inspector, I want to take a photo of the VIN or serial number plate, so that the system can extract the identifier automatically.
6. As a field inspector, I want to see the VIN/serial number extracted from my photo as an editable text field, so that I can correct OCR errors before proceeding.
7. As a field inspector, I want the app to look up the VIN/serial against the NHTSA database, so that I get authoritative equipment identity data.
8. As a field inspector, I want the app to fall back to AI-based VIN interpretation if NHTSA returns no results, so that heavy equipment serial numbers (which aren't in NHTSA) are still handled.
9. As a field inspector, I want to capture multiple detail photos (hydraulics, undercarriage, cab, engine bay), so that the AI has enough visual context to assess the equipment's condition.
10. As a field inspector, I want to tap "Analyze Photos" to trigger AI analysis of all photos, so that the system identifies the equipment and summarizes its condition.
11. As a field inspector, I want to see a clear status indicator when AI analysis or VIN lookup is in progress, so that I know the app is working.
12. As a field inspector, I want to see a graceful error message if Claude or NHTSA is unavailable, so that I understand why results are missing and can proceed with manual entry.
13. As a field inspector, I want to continue filling out the inspection manually if AI analysis fails, so that a service outage doesn't block report submission.
14. As a field inspector, I want to see AI image results and VIN lookup results side-by-side, so that I can compare the two sources transparently.
15. As a field inspector, I want conflicting fields highlighted in amber, so that I can quickly spot where the two sources disagree.
16. As a field inspector, I want to tap a conflicting field and choose which source's value to use, so that I stay in control of the final data.
17. As a field inspector, I want to manually edit any equipment field regardless of AI or VIN values, so that I can correct errors from either source.
18. As a field inspector, I want to see an AI-generated condition summary above the condition assessment form, so that I have AI observations as a reference while filling in ratings.
19. As a field inspector, I want to assign an overall condition rating (Excellent / Good / Fair / Poor / Salvage) to the equipment, so that the report has a clear top-level assessment.
20. As a field inspector, I want to rate and add notes for Engine/Powertrain, Hydraulic System, Undercarriage/Tracks/Tires, and Cab/Controls/Electrical separately, so that the report captures granular condition detail.
21. As a field inspector, I want my name, GPS coordinates, and timestamp pre-populated in the inspector info section, so that I don't have to enter this data manually.
22. As a field inspector, I want to review a summary of all collected data before submitting, so that I can catch errors before the record is finalized.
23. As a field inspector, I want to submit the inspection and receive a PDF report URL, so that I can immediately share the report.
24. As a field inspector, I want to open or share the PDF from the app after submission, so that I can deliver the report to stakeholders on the spot.
25. As a field inspector, I want my in-progress wizard state saved after each step, so that I don't lose data if the app crashes or I switch apps.
26. As an organization, I want each inspection stored as a structured record in a database, so that reports are searchable and auditable.
27. As an organization, I want photos stored durably in cloud storage with references in the inspection record, so that visual evidence is preserved alongside the report data.
28. As an organization, I want the PDF to include a company logo placeholder, inspector info, equipment specs with source indicators, embedded photos, condition ratings, and a signature block, so that the report is professional and complete.

## Implementation Decisions

### Monorepo Structure
- `mobile/` — Expo React Native app
- `backend/` — Node.js TypeScript API

### Mobile Modules

**PhotoCaptureModule**
- Wraps `expo-camera` for photo capture
- Performs client-side image resize/compression before upload
- Target: ~1024px longest dimension, ~80% JPEG quality — balances bandwidth with AI analysis fidelity
- Interface: `capturePhoto(type) → { uri, base64, type }`

**WizardStateManager**
- Manages 5-step wizard state (overview, VIN, details, review, confirm)
- Persists current state to AsyncStorage under key `inspection_draft` after each step
- On app launch, checks for existing draft and prompts Resume or Start New
- Interface: `saveStep(step, data)`, `loadDraft() → draft | null`, `clearDraft()`

**APIClient**
- Axios-based HTTP client targeting the backend
- Normalizes errors into a typed `ServiceError` shape with a `source` field (claude | nhtsa | backend)
- Exposes service status to callers so the UI can show degraded-state banners
- No auth header for POC
- Interface: `analyzeImages(images)`, `lookupVin(vin)`, `submitInspection(data)`

**ConflictResolutionView**
- Renders two-column table: Image AI vs VIN Lookup
- Highlights conflicting fields in amber
- Tap-to-edit any field; tap conflict cell to pick a source value
- Reads from wizard state; writes resolved values back

### Backend Modules

**ImageAnalysisService**
- Sends overview + detail images in a single multi-image Claude message (`claude-sonnet-4-6`)
- Returns structured JSON: `{ make, model, year, engineType, transmission, gvwLbs, hoursOnMeter, conditionSummary, confidenceScore }`
- Returns `null` fields for anything that cannot be determined; never throws on partial results
- Interface: `analyzeImages(images: ImageInput[]) → EquipmentAnalysis`

**VINLookupService**
- Primary: NHTSA public API (`vpic.nhtsa.dot.gov`)
- Fallback: Claude prompt if NHTSA returns no `Make` result
- Returns `{ make, model, year, engineType, transmission, gvwLbs, source: 'nhtsa' | 'claude' }`
- Interface: `lookupVin(vin: string) → VinResult`

**PhotoStorageService**
- Uploads base64 images to Supabase Storage bucket `inspection-photos`
- Path pattern: `{inspectionId}/{type}-{timestamp}.jpg`
- Returns public URL per photo
- Interface: `uploadPhotos(inspectionId, photos) → { url, type }[]`

**InspectionRepository**
- Supabase PostgreSQL CRUD for `inspections` table
- Stores raw AI result, raw VIN result, merged equipment data, condition data, photo URLs, PDF URL
- Interface: `create(data) → inspection`, `findById(id) → inspection`

**PDFGeneratorService**
- Uses `pdfkit` to produce a PDF buffer (no headless browser)
- Sections: header (generic company logo placeholder), inspector info, equipment specs table with source indicators, photo grid, condition assessment, signature block
- Interface: `generate(inspection) → Buffer`

**API Routes (Fastify, thin handlers)**
- `POST /api/analyze/images` → ImageAnalysisService
- `POST /api/analyze/vin` → VINLookupService
- `POST /api/inspections` → PhotoStorageService + InspectionRepository + PDFGeneratorService
- `GET /api/inspections/:id` → InspectionRepository

### Supabase Schema

**`inspections` table**
- `id` uuid PK
- `created_at` timestamptz
- `inspector_name` text
- `gps_lat` float8
- `gps_lon` float8
- `equipment_data` jsonb (merged/resolved fields)
- `condition_data` jsonb (ratings + notes per section)
- `ai_image_result` jsonb (raw Claude response)
- `vin_lookup_result` jsonb (raw VIN lookup response)
- `pdf_url` text
- `photos` jsonb[] (`[{url, type}]`)

### Error Handling
- All external service failures (Claude, NHTSA, Supabase) are caught and normalized
- Mobile app shows a non-blocking status banner per failing service
- Inspector can proceed with manual entry if AI/VIN services are unavailable
- Wizard does not block progression on service failures

### PDF Delivery
- After submission, backend returns `{ inspectionId, pdfUrl }`
- Mobile app opens the PDF URL in the device's native browser/viewer via `Linking.openURL`

### Deployment (POC)
- Backend runs locally (`localhost`) during POC
- No CI/CD required for POC phase

## Testing Decisions

### What makes a good test
- Tests cover external behavior (inputs → outputs, side effects) — not implementation details
- External services (Claude, NHTSA, Supabase, Supabase Storage) are mocked
- Tests do not assert on internal method calls, only on returned values and observable state changes

### Modules under test

**Backend**
- `ImageAnalysisService` — mock Claude SDK; assert structured JSON output for happy path, assert null fields for unrecognizable input, assert error normalization
- `VINLookupService` — mock NHTSA fetch and Claude SDK; assert NHTSA path returns `source: 'nhtsa'`, assert Claude fallback triggers when NHTSA has no Make, assert Claude fallback returns `source: 'claude'`
- `InspectionRepository` — mock Supabase client; assert create returns record with id, assert findById returns expected shape
- `PhotoStorageService` — mock Supabase Storage; assert correct path pattern, assert URL returned per photo
- `PDFGeneratorService` — assert output is a non-empty Buffer; assert PDF contains key text strings (inspector name, equipment make)

**Mobile**
- `PhotoCaptureModule` — mock expo-camera; assert resize is applied, assert correct `type` label on output
- `WizardStateManager` — mock AsyncStorage; assert each step persists state, assert loadDraft returns persisted data, assert clearDraft removes key
- `APIClient` — mock Axios; assert correct endpoint called, assert `ServiceError` shape returned on failure, assert source field set correctly per endpoint

## Out of Scope

- User authentication and multi-inspector support (post-POC: Supabase Auth + Row Level Security)
- Offline draft sync (post-POC: WatermelonDB or SQLite + background sync)
- PDF white-labeling per client organization
- Signature capture on-device
- Commercial VIN API (DataOne) for production heavy equipment coverage
- Push notifications
- Report history / search within the mobile app
- CI/CD pipeline

## Further Notes

- Claude model: `claude-sonnet-4-6`
- NHTSA API: `https://vpic.nhtsa.dot.gov/api/` (public, no key required)
- The "company logo placeholder" in the PDF header is intentionally generic; it will be replaced with a real logo in a future version
- The POC is a foundation for a real product — code quality and module interfaces should reflect that, even though auth and offline support are deferred
