# Email-Only User Identification

## Context

Mater is a POC heavy equipment inspection app with no user concept today. For demo purposes (10-30 testers), we need to identify who intaked each asset, filter assets by user, and show a display name in the UI. Full OAuth/password auth is overkill for a POC — we need the simplest thing that looks and feels like a real login.

## Decision

Email-only login. No password, no verification, no magic link. User enters email, backend upserts a user record, app stores identity in AsyncStorage. Display name derived from email prefix (e.g. `zach` from `zach@company.com`).

## Database

### New `users` table

```sql
create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  display_name text not null,
  created_at timestamptz default now()
);

-- RLS: service role full access (same pattern as assets table)
alter table users enable row level security;
create policy "service_role_all_users" on users
  for all using (auth.role() = 'service_role');
```

### Modify `assets` table

```sql
alter table assets add column user_id uuid references users(id);
```

### Populate `intake_events.operator_name`

The existing `operator_name` column (currently always null) gets populated with the user's display name at intake time.

## API

### `POST /api/users/login`

- Body: `{ email: string }`
- Validates email format (basic regex, nothing strict)
- Upserts into `users` table by email. On insert, derives `display_name` from email prefix (everything before `@`)
- Returns: `{ id, email, display_name, created_at }`

### Modified: `POST /api/assets`

- Add required `user_id` field to request body
- Store `user_id` on the asset row
- Populate `intake_events.operator_name` with the user's display name

### Modified: `GET /api/assets`

- Add optional `?user_id=` query param for filtering
- No breaking change — omitting the param returns all assets (existing behavior)

## Mobile

### New: `UserContext`

- `UserProvider` wraps the app (inside `ThemeProvider`)
- Stores `{ id, email, displayName }` in state
- On mount: reads email from `AsyncStorage` key `user_email`
  - If found: calls `POST /api/users/login` to get/refresh user object, sets context
  - If not found: sets user to null (triggers login screen)
- Exposes `login(email)` and `logout()` functions
- `login`: calls API, stores email in AsyncStorage, sets user state
- `logout`: clears AsyncStorage key, sets user to null

### New: `LoginScreen`

- Shown when `UserContext` user is null (before any other screen)
- Single email `TextInput` + "Continue" button
- App logo/branding at top (consistent with existing theme)
- Basic client-side email format validation
- On submit: calls `userContext.login(email)`
- Generous touch targets per existing app conventions

### Modified: `App.tsx`

- Wrap `AppContent` with `UserProvider`
- Gate on user state: no user → `LoginScreen`, has user → existing screen router
- Pass `user_id` to `createAsset` call

### Modified: `AssetListScreen`

- Add filter toggle: "My Assets" / "All Assets"
- Pass `user_id` query param when filtering
- Show operator name on asset list items

### Logout

- Add logout button to the home screen header or a simple settings area
- Calls `userContext.logout()` → returns to login screen

## What This Does NOT Do

- No email verification or magic links
- No passwords, tokens, or JWTs
- No session expiry
- No authorization (any user can view/edit any asset)
- No user management UI beyond login/logout

These are all acceptable tradeoffs for a POC demo.

## Verification

1. Fresh launch → login screen appears
2. Enter email → lands on home screen, display name visible
3. Kill and reopen app → skips login, goes straight to home
4. Create an asset → asset row has `user_id`, intake event has `operator_name`
5. Filter "My Assets" → shows only current user's assets
6. Logout → returns to login screen
7. Login as different email → see different "My Assets" list
