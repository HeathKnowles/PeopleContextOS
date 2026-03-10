# PeopleContextOS

**Hyper-Local Geo-Context Targeting Engine**

A full-stack platform that lets you draw geofences on a map, attach campaigns to them, and automatically deliver real-time contextual notifications to Android users the moment they enter a zone.

```
┌─────────────────────┐     REST/SSE      ┌──────────────────────┐
│   Admin Dashboard   │ ◄────────────────► │   Fastify Backend    │
│  (Next.js 16 / RSC) │                   │ (Bun · PostGIS · Redis│
└─────────────────────┘                   └──────────┬───────────┘
                                                      │ FCM / local
                                          ┌───────────▼───────────┐
                                          │   Android SDK + App   │
                                          │  (Kotlin · Compose)   │
                                          └───────────────────────┘
```

---

## Monorepo Structure

```
PeopleContextOS/
├── backend/          # Bun + Fastify REST API
├── dashboard/        # Next.js 16 admin dashboard
└── App/              # Android app + SDK (Gradle multi-module)
    ├── app/          # Demo app (Jetpack Compose)
    └── sdk/          # PeopleContext SDK (Android library)
```

---

## Features

| Layer | Capability |
|---|---|
| **Dashboard** | Leaflet map, draw geofences, attach campaigns, manage users & API keys (admin/customer RBAC) |
| **Backend** | PostGIS containment queries, 30-min dedup, Redis pub/sub event stream, FCM push (mock-safe), JWT + API-key auth |
| **SDK** | Device registration, FusedLocationProvider polling, fence overlay cards, local + FCM notifications |

---

## Prerequisites

| Tool | Version |
|---|---|
| [Bun](https://bun.sh) | ≥ 1.1 |
| [Node.js](https://nodejs.org) | ≥ 20 (dashboard) |
| [PostgreSQL](https://www.postgresql.org) + [PostGIS](https://postgis.net) | PG 15+ / PostGIS 3+ |
| [Redis](https://redis.io) | ≥ 7 |
| [Android Studio](https://developer.android.com/studio) | Hedgehog+ |
| Android SDK | API 34+ (minSdk 34, compileSdk 36) |
| JDK | 17+ |

---

## Quick Start

### 1. Backend

```bash
cd backend
cp .env.example .env        # fill in DATABASE_URL, REDIS_URL, secrets
bun install
bun run dev                 # hot-reload on :4000
```

Migrations run automatically on startup. PostGIS extension must be created once as a superuser:
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

### 2. Dashboard

```bash
cd dashboard
cp .env.example .env.local  # set NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
npm install
npm run dev                 # :3000
```

#### First admin account

1. Sign up at `http://localhost:3000/auth`
2. Bootstrap your account as admin (only works while zero admins exist):
```bash
curl -X POST http://localhost:4000/admin/bootstrap \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com"}'
```
3. Sign out and back in — you now have full admin access.

### 3. Android App

```bash
cd App
```

1. Copy `google-services.json` into `App/app/` (download from Firebase Console → Project Settings → Android app)
2. Edit `local.properties`:
```properties
sdk.dir=/path/to/Android/Sdk
backend.url=http://10.0.2.2:4000   # emulator host
sdk.apiKey=pcos_<your API key from dashboard /api-keys>
```
3. Build & run:
```bash
./gradlew installDebug
```

---

## Backend API Reference

### Auth
| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/*` | — | better-auth session endpoints (sign-up, sign-in, sign-out) |
| `POST` | `/admin/token` | Session cookie | Exchange session for a Bearer JWT |
| `POST` | `/admin/bootstrap` | — | Promote first user to admin (one-time) |

### SDK (API key auth — `Authorization: Bearer pcos_...`)
| Method | Path | Description |
|---|---|---|
| `POST` | `/device/register` | Register/update device + FCM token |
| `POST` | `/location/event` | Location ping → PostGIS fence match → FCM push |
| `GET` | `/fences/nearby` | Fences within a radius of a point |

### Admin (JWT Bearer — admin role only)
| Method | Path | Description |
|---|---|---|
| `GET/POST` | `/admin/fences` | List / create geofences |
| `GET/DELETE` | `/admin/fences/:id` | Get / delete a fence |
| `GET/POST` | `/admin/campaigns` | List / create campaigns |
| `GET/POST` | `/admin/sites` | List / create development sites |
| `GET` | `/admin/users` | List all users |
| `PATCH` | `/admin/users/:id/role` | Promote / demote user (`admin`\|`customer`) |
| `GET/POST/DELETE` | `/admin/api-keys` | Manage all SDK API keys |

### Customer (JWT Bearer — any authenticated user)
| Method | Path | Description |
|---|---|---|
| `GET/POST` | `/sdk/api-keys` | List / create own API keys |
| `DELETE` | `/sdk/api-keys/:id` | Revoke own API key |

### Streaming
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/events/stream` | JWT Bearer | SSE stream of real-time fence match events |

---

## Environment Variables

### `backend/.env`

```env
PORT=4000
NODE_ENV=development

BETTER_AUTH_SECRET=<32+ char random string>
BETTER_AUTH_URL=http://localhost:4000
JWT_SECRET=<32+ char random string>
JWT_EXPIRES_IN=24h

TRUSTED_ORIGINS=http://localhost:3000

DATABASE_URL=postgresql://user:password@localhost:5432/geocontext
REDIS_URL=redis://localhost:6379

# Firebase — optional, runs in mock mode without these
# Get from: Firebase Console → Project Settings → Service Accounts → Generate new private key
FIREBASE_PROJECT_ID=peoplecontextos
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@peoplecontextos.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

RATE_LIMIT_MAX=1000
RATE_LIMIT_WINDOW_MS=60000
```

### `dashboard/.env.local`

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
```

### `App/local.properties`

```properties
sdk.dir=/path/to/Android/Sdk
backend.url=http://10.0.2.2:4000
sdk.apiKey=pcos_<key from dashboard>
```

---

## Architecture

### Fence-Match Pipeline

```
Android SDK
  └─ POST /location/event { device_id, lat, lng }
        │
        ▼
  PostGIS ST_DWithin query
        │ matched fences
        ▼
  For each fence:
    ├─ Fetch active campaign
    ├─ Dedup check (Redis 30 min TTL)
    ├─ Log to event_logs
    ├─ Send FCM push via Firebase Admin SDK
    └─ Publish to Redis "geo:events" channel
              │
              ▼
        SSE stream → Dashboard /events/stream
```

### RBAC

| Role | Access |
|---|---|
| `admin` | Full dashboard access: map, geofences, campaigns, users, API keys |
| `customer` | API Keys page only — generate keys for SDK use |

### Android SDK

```kotlin
// 1. Initialise once
PeopleContextSDK.init(context, SDKConfig(
    backendUrl = "https://your-backend.com",
    apiKey     = "pcos_...",
))

// 2. Register device (call on every launch)
PeopleContextSDK.registerDevice(fcmToken = token)

// 3. Start geo-fence tracking
PeopleContextSDK.startLocationTracking(
    onFenceMatched = { result -> /* result.fences, result.matched */ },
    onError        = { error -> }
)

// 4. Stop when done
PeopleContextSDK.stopLocationTracking()
```

---

## Tech Stack

| Layer | Tech |
|---|---|
| Backend | [Bun](https://bun.sh), [Fastify](https://fastify.dev), [better-auth](https://www.better-auth.com), PostgreSQL + PostGIS, Redis, Firebase Admin SDK |
| Dashboard | Next.js 16, React 19, shadcn/ui, Tailwind CSS, Leaflet, better-auth React client |
| Android App | Kotlin, Jetpack Compose, Material 3 |
| Android SDK | Kotlin, OkHttp 4, Gson, Coroutines, FusedLocationProviderClient, Firebase Messaging |
| Build | Gradle 9.2 / AGP 9.0.1, Kotlin 2.0.21 |

---

## Notifications

The app delivers notifications at two levels:

1. **Local notification** — posted immediately by the SDK when `onFenceMatched` fires, using `NotificationCompat`. Works without Firebase.
2. **FCM push notification** — sent by the backend via Firebase Admin SDK. Requires:
   - `google-services.json` in `App/app/` (from Firebase Console)
   - `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY` in `backend/.env` (from a service account key)

Without Firebase credentials the backend runs in **mock mode** — all logic executes but no push is sent.

---

## Security Notes

- `google-services.json` and `local.properties` are gitignored — never commit them
- `backend/.env` is gitignored — use `.env.example` as the template
- API keys are stored as SHA-256 hashes; the raw `pcos_` key is shown **once** at creation
- The `/admin/bootstrap` endpoint is self-sealing — it 403s once any admin exists
