# Mater Deployment Plan

> Demo deployment for 1-5 concurrent users. Optimized for ease of updates, not scale.

## Architecture Overview

```
Mobile (Expo/iOS)          Backend (Fly.io)
  TestFlight ──────────> Fastify API (Node.js)
                              │
                    ┌─────────┼─────────┐
                    ▼         ▼         ▼
              Supabase    Claude     NHTSA
              Cloud       API        API
              (DB+Storage)
```

---

## 1. Prerequisites

### Apple Developer Account
- Sign up at [developer.apple.com](https://developer.apple.com) ($99/yr)
- Required for TestFlight distribution
- Approval takes 24-48 hrs after payment

### Supabase Cloud
- Already in use. Ensure your project is on the free or Pro tier
- Note the project URL and service role key from Settings > API

### EAS Account (Expo)
- Sign up at [expo.dev](https://expo.dev) (free tier works)
- Install EAS CLI: `npm install -g eas-cli && eas login`

---

## 2. Backend Deployment (Fly.io)

### Why Fly.io
- Simple CLI-driven deploys (`fly deploy`)
- Always-on machines (no cold starts) for ~$3-5/mo
- Built-in HTTPS with custom domains
- Easy log access and SSH

### Setup Steps

#### 2.1 Install Fly CLI & Create App
```bash
# Install
brew install flyctl

# Login/signup
fly auth login

# From repo root, init in backend/
cd backend
fly launch --no-deploy
```

#### 2.2 Create `backend/Dockerfile`
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

#### 2.3 Create `backend/fly.toml`
```toml
app = "mater-backend"
primary_region = "dfw"

[build]

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = "off"
  auto_start_machines = true
  min_machines_running = 1

[[vm]]
  size = "shared-cpu-1x"
  memory = "512mb"
```

#### 2.4 Set Secrets (Environment Variables)
```bash
fly secrets set SUPABASE_URL="https://your-project.supabase.co"
fly secrets set SUPABASE_SERVICE_KEY="your-service-role-key"
fly secrets set ANTHROPIC_API_KEY="your-anthropic-key"
```

#### 2.5 Deploy
```bash
fly deploy
```

Backend will be live at `https://mater-backend.fly.dev`

#### 2.6 Updating the Backend
```bash
cd backend
fly deploy
```
That's it. One command to push updates. Rollback with `fly releases rollback`.

---

## 3. Mobile App Deployment (EAS + TestFlight)

### Why TestFlight
- Apple's official beta distribution
- Up to 10,000 testers via email invite
- OTA updates possible via `expo-updates` for JS-only changes

### Setup Steps

#### 3.1 Configure EAS

Create `mobile/eas.json`:
```json
{
  "cli": {
    "version": ">= 15.0.0",
    "appVersionSource": "remote"
  },
  "build": {
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "production": {
      "ios": {
        "distribution": "store"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@email.com",
        "ascAppId": "your-app-store-connect-app-id"
      }
    }
  }
}
```

#### 3.2 Update `mobile/app.json`

Add required fields for iOS build:
```json
{
  "expo": {
    "name": "Mater",
    "slug": "mater",
    "version": "1.0.0",
    "ios": {
      "bundleIdentifier": "com.yourcompany.mater",
      "buildNumber": "1",
      "supportsTablet": true,
      "infoPlist": {
        "NSCameraUsageDescription": "Mater needs camera access to photograph equipment",
        "NSLocationWhenInUseUsageDescription": "Mater uses your location to tag equipment intake location"
      }
    }
  }
}
```

#### 3.3 Make API URL Configurable

Update `mobile/src/services/APIClient.ts` to use an environment-based URL:

```typescript
import Constants from 'expo-constants';

const API_BASE_URL = Constants.expoConfig?.extra?.apiBaseUrl ?? 'http://localhost:3000';

// In constructor:
constructor(baseURL: string = API_BASE_URL) { ... }
```

Create `mobile/app.config.js` (wraps `app.json` with env vars):
```javascript
export default ({ config }) => ({
  ...config,
  extra: {
    apiBaseUrl: process.env.API_BASE_URL ?? 'http://localhost:3000',
  },
});
```

Set during EAS build:
```bash
API_BASE_URL=https://mater-backend.fly.dev eas build --platform ios --profile production
```

#### 3.4 Build & Submit to TestFlight

```bash
cd mobile

# First time: EAS handles provisioning profiles & signing automatically
eas build --platform ios --profile production

# Submit to App Store Connect (TestFlight)
eas submit --platform ios
```

#### 3.5 Distribute via TestFlight
1. Open [App Store Connect](https://appstoreconnect.apple.com)
2. Go to your app > TestFlight
3. Add testers by email (internal testers get builds immediately)
4. Testers install via TestFlight app on their iPhones

#### 3.6 Updating the Mobile App

**For JS-only changes (most updates):**

Add `expo-updates` for OTA:
```bash
cd mobile
npx expo install expo-updates
```

Add to `app.json`:
```json
{
  "expo": {
    "updates": {
      "url": "https://u.expo.dev/your-project-id"
    },
    "runtimeVersion": {
      "policy": "appVersion"
    }
  }
}
```

Then push updates without rebuilding:
```bash
eas update --branch production --message "fix: updated analysis flow"
```
Users get the update next time they open the app. No TestFlight review needed.

**For native dependency changes:**
```bash
eas build --platform ios --profile production
eas submit --platform ios
```
Requires TestFlight review (~24-48 hrs).

---

## 4. Update Workflow Summary

| Change Type | Command | User Action | Downtime |
|---|---|---|---|
| Backend code | `fly deploy` | None | ~10 sec (rolling) |
| Mobile JS/TS | `eas update --branch production` | Reopen app | None |
| Mobile native deps | `eas build` + `eas submit` | Update TestFlight | None (old version works) |
| DB schema | Supabase Dashboard or `supabase db push` | None | Depends on migration |

---

## 5. Environment Variable Summary

### Backend (Fly.io secrets)
| Variable | Source |
|---|---|
| `SUPABASE_URL` | Supabase project settings |
| `SUPABASE_SERVICE_KEY` | Supabase project settings |
| `ANTHROPIC_API_KEY` | Anthropic console |
| `PORT` | Auto-set to 3000 via Dockerfile |

### Mobile (build-time via EAS)
| Variable | Value |
|---|---|
| `API_BASE_URL` | `https://mater-backend.fly.dev` |

---

## 6. Cost Estimate

| Service | Cost |
|---|---|
| Apple Developer Program | $99/yr |
| Fly.io (shared-cpu-1x, 512MB) | ~$3-5/mo |
| Supabase Cloud (free tier) | $0 |
| EAS Build (free tier: 15 builds/mo) | $0 |
| EAS Update (free tier) | $0 |
| **Total** | **~$104/yr + ~$5/mo** |

---

## 7. Checklist

- [ ] Sign up for Apple Developer account
- [ ] Install Fly CLI and EAS CLI
- [ ] Create Dockerfile and fly.toml for backend
- [ ] Deploy backend to Fly.io
- [ ] Set Fly.io secrets (env vars)
- [ ] Verify backend health at `https://mater-backend.fly.dev/health`
- [ ] Update mobile app.json with bundleIdentifier and iOS config
- [ ] Make API URL configurable via app.config.js
- [ ] Install expo-updates
- [ ] Run first EAS build for iOS
- [ ] Submit to TestFlight
- [ ] Add demo testers in App Store Connect
- [ ] Test full flow: photo capture -> AI analysis -> asset creation
