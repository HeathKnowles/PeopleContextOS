# Geo-Context Backend

Hyper-Local Geo-Context Targeting Engine — TypeScript / Fastify backend.

## Quick Start

```bash
npm install
cp .env.example .env   # fill in your values
npm run dev            # ts-node-dev hot reload
```

## Prerequisites

- PostgreSQL with **PostGIS** extension
- Redis
- Firebase project (for push — optional, runs in mock mode without it)

## Project Structure

```
src/
  types/index.ts          — all domain + API types
  db/
    client.ts             — PostgreSQL pool + migrations
    redis.ts              — Redis client + cache helpers
  utils/logger.ts         — pino logger
  middleware/auth.ts      — API key guard
  services/
    fenceService.ts       — GeoFence CRUD + PostGIS queries
    deviceService.ts      — device upsert/lookup
    campaignService.ts    — campaign CRUD + active lookup
    eventEngine.ts        — geo-lookup → dedup → push pipeline
    notificationService.ts — Firebase FCM (mock-safe)
  routes/
    device.ts             — POST /device/register, GET /device/:id
    location.ts           — POST /location/event, GET /fences/nearby
    event.ts              — POST /event/trigger, GET /event/logs, GET /event/stats/:id
    admin.ts              — /admin/fences + /admin/campaigns CRUD
  app.ts                  — Fastify instance factory
  index.ts                — entry point (migrations → server start)
tests/
  test.ts                 — input/output verification (ts-node tests/test.ts)
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check |
| POST | /device/register | Register/update a device |
| GET | /device/:id | Get device by ID |
| POST | /location/event | Raw location ping → pipeline |
| GET | /fences/nearby | Fences near a point |
| POST | /event/trigger | SDK fence transition |
| GET | /event/logs | Event log query |
| GET | /event/stats/:fence_id | Per-fence analytics |
| POST | /admin/fences | Create a geo-fence |
| GET | /admin/fences | List all fences |
| GET | /admin/fences/:id | Get fence |
| DELETE | /admin/fences/:id | Delete fence |
| POST | /admin/campaigns | Create campaign |
| GET | /admin/campaigns | List campaigns |
| PATCH | /admin/campaigns/:id/toggle | Enable/disable campaign |

## Auth

All endpoints require `x-api-key: <key>` header.  
Set `VALID_API_KEYS=key1,key2` in `.env`.

## Running Tests

```bash
# Structural tests (no DB needed)
ts-node tests/test.ts

# Integration tests (DB + Redis)
DATABASE_URL=postgresql://... REDIS_URL=redis://... ts-node tests/test.ts
```
