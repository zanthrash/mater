# Voice Notes Feature — Implementation Plan

## Context
Field workers ingesting assets want to record spoken observations while reviewing equipment. This adds an optional voice notes section to the Review screen that records short AAC clips, uploads them immediately, and transcribes them server-side via Claude's audio API. Dashboard shows transcript-first with inline playback.

## Design Decisions (Agreed)
- Optional collapsible section at bottom of ReviewEditScreen (no new wizard step)
- Unlimited notes, 60s max each, AAC/M4A via expo-av
- Supabase Storage, immediate background upload per recording
- Server-side transcription via Claude audio input API
- Transcript-first on dashboard with play button
- General list per asset (not photo-linked)
- Offline: queue locally, retry silently

## Key Architecture Decision: Temp Upload Pattern
Assets don't exist until submit. Voice notes are recorded before submit. Solution: upload to a `temp/{sessionId}/` path in Supabase Storage, store metadata in a `pending_voice_notes` table, then move files + associate on asset creation.

---

## Phase 1: Database & Storage

### 1a. Migration: voice-notes bucket + pending table + asset column
**File:** `backend/supabase/migrations/20260416000000_add_voice_notes.sql`

```sql
-- voice_notes column on assets
ALTER TABLE assets ADD COLUMN voice_notes jsonb DEFAULT '[]';

-- pending voice notes (pre-submit staging)
CREATE TABLE IF NOT EXISTS pending_voice_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  temp_path text NOT NULL,
  public_url text NOT NULL,
  duration_seconds integer NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  transcript text,
  transcription_status text NOT NULL DEFAULT 'pending'
);
CREATE INDEX ON pending_voice_notes (session_id);
```

Bucket creation: handle in `VoiceNoteStorageService` init (same pattern as photo bucket — check exists, create if not).

Run `supabase db push` after creating migration.

---

## Phase 2: Backend Services & Routes

### 2a. VoiceNoteStorageService
**New file:** `backend/src/services/VoiceNoteStorageService.ts`
- Bucket: `voice-notes`
- `uploadTemp(sessionId, audioBuffer, durationSeconds)` → `temp/{sessionId}/{timestamp}.m4a`
- `moveToAsset(tempPath, assetId)` → download from temp, upload to `{assetId}/{timestamp}.m4a`, delete temp, return new URL
- `cleanupTemp(sessionId)` → delete all under `temp/{sessionId}/`
- Pattern after existing `PhotoStorageService.ts`

### 2b. TranscriptionService
**New file:** `backend/src/services/TranscriptionService.ts`
- Uses `@anthropic-ai/sdk` (already `^0.39.0` in package.json)
- Sends audio as base64 content block to Claude (`claude-sonnet-4-6`)
- System prompt focused on heavy equipment field inspection transcription
- Returns `{ transcript: string }`
- Tracks token usage via existing `AiUsageRepository` with operation `'transcribe'`

### 2c. PendingVoiceNoteRepository
**New file:** `backend/src/repositories/PendingVoiceNoteRepository.ts`
- `create(data)`, `findBySessionId(sessionId)`, `updateTranscript(id, transcript, status)`, `deleteBySessionId(sessionId)`, `deleteById(id)`

### 2d. Voice notes route
**New file:** `backend/src/routes/voiceNotes.ts`

Endpoints:
- `POST /api/voice-notes/upload` — multipart/form-data (`audio` file, `sessionId`, `durationSeconds`). Uploads temp, inserts pending row, fires async transcription. Returns `{ id, tempPath, publicUrl }`.
- `GET /api/voice-notes/session/:sessionId` — returns all pending notes for session (with transcription status).
- `DELETE /api/voice-notes/:id` — deletes pending note + storage file.

### 2e. Add @fastify/multipart
**File:** `backend/package.json` — add `@fastify/multipart`

### 2f. Register route
**File:** `backend/src/app.ts` — import and register `voiceNotesRoute`, register `@fastify/multipart`

### 2g. Extend POST /api/assets
**File:** `backend/src/routes/assets.ts`
- Add optional `voiceNoteSessionId` to request body schema
- After asset creation + photo upload: query pending_voice_notes by sessionId, move each to asset path, build voice_notes JSONB array, update asset, delete pending rows

### 2h. Update AssetRepository
**File:** `backend/src/repositories/AssetRepository.ts`
- Add `voice_notes` to Asset interface and queries

---

## Phase 3: Mobile — Recording & Upload

### 3a. Install expo-av
**File:** `mobile/package.json` — add `expo-av`

### 3b. iOS microphone permission
**File:** `mobile/app.json`
- Add to `infoPlist`: `"NSMicrophoneUsageDescription": "RBAI needs microphone access to record voice notes during equipment inspection"`
- Add `"expo-av"` to `plugins` array

### 3c. VoiceNoteUploader service
**New file:** `mobile/src/services/VoiceNoteUploader.ts`
- `upload(sessionId, fileUri, durationSeconds)` — reads file, sends as FormData to `/api/voice-notes/upload`
- `pollTranscription(sessionId)` — calls GET session endpoint
- `deleteNote(id)` — calls DELETE endpoint
- Offline queue: on upload failure, save to AsyncStorage queue. Retry on mount / app foreground.

### 3d. VoiceNoteRecorder component
**New file:** `mobile/src/components/VoiceNoteRecorder.tsx`
- Collapsible section, collapsed by default. Header: "Voice Notes (optional)" + count badge + chevron
- Expanded: list of recordings (duration, transcript or "Transcribing...", play/pause, delete) + record button
- Record: expo-av Audio.Recording, AAC preset, 60s auto-stop, timer display
- On stop: trigger upload via VoiceNoteUploader, add to local list
- Playback: expo-av Audio.Sound for inline playback

### 3e. Integrate into ReviewEditScreen
**File:** `mobile/src/screens/ReviewEditScreen.tsx`
- Add `VoiceNoteRecorder` between Photos section (~line 590) and save error banner (~line 593)
- Props: `sessionId`, `notes`, `onNotesChange`

### 3f. Wire up App.tsx
**File:** `mobile/src/App.tsx`
- New state: `voiceNoteSessionId` (UUID, generated per wizard run), `voiceNotes` array
- Reset both in `resetAll()`
- Pass to ReviewEditScreen
- Add `voiceNoteSessionId` to createAsset payload
- Persist in draft state (AsyncStorage)

### 3g. Update APIClient
**File:** `mobile/src/services/APIClient.ts`
- Add `voiceNoteSessionId?: string` to CreateAssetRequest
- Add `voice_notes` to Asset interface

---

## Phase 4: Dashboard — Display

### 4a. Update types
**File:** `dashboard/src/api/types.ts`
- Add `voice_notes: Array<{ url: string; transcript: string | null; duration_seconds: number; recorded_at: string }>` to Asset

### 4b. VoiceNotesCard component
**New file:** `dashboard/src/components/VoiceNotesCard.tsx`
- Card matching existing pattern (`bg-[var(--color-surface-card)] rounded-xl p-3.5 border`)
- Header: "Voice Notes" + Mic icon + count
- Per note: transcript text (primary), then row with duration badge + relative timestamp + Play/Pause button
- Audio via hidden `<audio>` element, controlled by button state
- "Transcription pending..." for null transcripts

### 4c. Add to asset detail
**File:** `dashboard/src/routes/assets/$id.tsx`
- Add VoiceNotesCard in right panel between Yard Info and Intake History (~line 162)
- Conditionally render only when voice_notes has entries

---

## Phase 5: Offline Resilience

### 5a. OfflineVoiceNoteQueue
**New file:** `mobile/src/services/OfflineVoiceNoteQueue.ts`
- AsyncStorage-backed queue
- `enqueue`, `dequeue`, `getAll`, `processQueue`
- Triggered on component mount + AppState change to 'active'

### 5b. Submit guard
**File:** `mobile/src/App.tsx`
- Before createAsset: check queue for pending uploads, attempt flush
- If items remain: show alert, block submit

---

## Implementation Order
1. Phase 1 (DB migration) — foundation
2. Phase 2 (Backend) — services, routes, asset integration
3. Phase 3 (Mobile) — recording UI, upload, App.tsx wiring
4. Phase 4 (Dashboard) — display component
5. Phase 5 (Offline) — resilience layer

Phases 3 and 4 can run in parallel after Phase 2.

---

## Verification
1. **Backend**: Start dev server, POST a voice note upload via curl with a test .m4a file, verify it lands in Supabase Storage under temp/, verify pending_voice_notes row created, verify transcription completes
2. **Mobile**: Run on iOS simulator, open Review screen, expand Voice Notes, record a clip, verify upload succeeds, verify playback works, verify transcript appears after a few seconds
3. **Submit flow**: Complete full wizard, verify voice notes move from temp/ to asset path in storage, verify asset.voice_notes populated correctly
4. **Dashboard**: Open asset detail for an asset with voice notes, verify transcripts display, verify audio playback works
5. **Offline**: Enable airplane mode, record a note, verify it queues locally, disable airplane mode, verify it uploads on retry
6. **Edge cases**: Record exactly 60s (auto-stop), delete a note before submit, submit with zero notes (no regression)
