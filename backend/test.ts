/**
 * tests/test.ts
 * Input → output verification for every endpoint.
 * Uses Fastify inject — no real network needed.
 * Set DATABASE_URL + REDIS_URL to enable integration tests.
 * Run: ts-node tests/test.ts
 */

import { buildApp } from "../src/app";
import { FastifyInstance } from "fastify";

type Result = { name: string; passed: boolean; error?: string };
const results: Result[] = [];

async function test(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    results.push({ name, passed: true });
    console.log(`  ✓ ${name}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    results.push({ name, passed: false, error: msg });
    console.log(`  ✗ ${name}\n    → ${msg}`);
  }
}

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

type Body = Record<string, unknown>;
type InjectReply = Awaited<ReturnType<FastifyInstance["inject"]>>;
const j = (r: InjectReply): Body => r.json() as Body;

const API_KEY = "dev-key-1";
const h = { "Content-Type": "application/json", "x-api-key": API_KEY };

(async () => {
  console.log("\n═══ Geo-Context Backend — Input/Output Tests ═══\n");
  process.env.VALID_API_KEYS = "dev-key-1";
  process.env.NODE_ENV = "test";

  const app = await buildApp();
  await app.ready();

  // ── Health ──────────────────────────────────────────────────────────
  console.log("Health:");

  await test("GET /health → 200 { status:'ok', uptime:number }", async () => {
    const r = await app.inject({ method: "GET", url: "/health" });
    assert(r.statusCode === 200, `Expected 200, got ${r.statusCode}`);
    const b = j(r);
    assert(b["status"] === "ok", `Expected status=ok`);
    assert(typeof b["uptime"] === "number", "uptime must be number");
    console.log("    →", JSON.stringify(b));
  });

  // ── Auth guard ──────────────────────────────────────────────────────
  console.log("\nAuth:");

  await test("No API key → 401", async () => {
    const r = await app.inject({
      method: "POST",
      url: "/device/register",
      headers: { "Content-Type": "application/json" },
      payload: { device_id: "d1", platform: "android", app_version: "1.0" },
    });
    assert(r.statusCode === 401, `Expected 401, got ${r.statusCode}`);
    assert(j(r)["success"] === false, "Expected success=false");
    console.log("    →", JSON.stringify(j(r)));
  });

  await test("Wrong API key → 401", async () => {
    const r = await app.inject({
      method: "POST",
      url: "/device/register",
      headers: { "Content-Type": "application/json", "x-api-key": "bad" },
      payload: { device_id: "d1", platform: "android", app_version: "1.0" },
    });
    assert(r.statusCode === 401, `Expected 401, got ${r.statusCode}`);
  });

  // ── Device ──────────────────────────────────────────────────────────
  console.log("\nDevice:");

  await test("POST /device/register — missing fields → 400", async () => {
    const r = await app.inject({
      method: "POST",
      url: "/device/register",
      headers: h,
      payload: { device_id: "d1" },
    });
    assert(r.statusCode === 400, `Expected 400, got ${r.statusCode}`);
    assert(j(r)["success"] === false, "Expected success=false");
    console.log("    →", JSON.stringify(j(r)));
  });

  await test("POST /device/register — bad platform → 400", async () => {
    const r = await app.inject({
      method: "POST",
      url: "/device/register",
      headers: h,
      payload: { device_id: "d1", platform: "windows", app_version: "1.0" },
    });
    assert(r.statusCode === 400, `Expected 400, got ${r.statusCode}`);
    console.log("    →", JSON.stringify(j(r)));
  });

  // ── Location ─────────────────────────────────────────────────────────
  console.log("\nLocation:");

  await test("POST /location/event — missing fields → 400", async () => {
    const r = await app.inject({
      method: "POST",
      url: "/location/event",
      headers: h,
      payload: { device_id: "d1", lat: 13.08 },
    });
    assert(r.statusCode === 400, `Expected 400, got ${r.statusCode}`);
    assert(j(r)["success"] === false, "Expected success=false");
    console.log("    →", JSON.stringify(j(r)));
  });

  await test("POST /location/event — invalid lat → 400", async () => {
    const r = await app.inject({
      method: "POST",
      url: "/location/event",
      headers: h,
      payload: { device_id: "d1", lat: 999, lng: 80.27, timestamp: Date.now() },
    });
    assert(r.statusCode === 400, `Expected 400, got ${r.statusCode}`);
    console.log("    →", JSON.stringify(j(r)));
  });

  await test("GET /fences/nearby — non-numeric coords → 400", async () => {
    const r = await app.inject({
      method: "GET",
      url: "/fences/nearby?lat=abc&lng=xyz",
      headers: h,
    });
    assert(r.statusCode === 400, `Expected 400, got ${r.statusCode}`);
    assert(j(r)["success"] === false, "Expected success=false");
    console.log("    →", JSON.stringify(j(r)));
  });

  // ── Event ────────────────────────────────────────────────────────────
  console.log("\nEvent:");

  await test("POST /event/trigger — missing fields → 400", async () => {
    const r = await app.inject({
      method: "POST",
      url: "/event/trigger",
      headers: h,
      payload: { device_id: "d1" },
    });
    assert(r.statusCode === 400, `Expected 400, got ${r.statusCode}`);
    assert(j(r)["success"] === false, "Expected success=false");
    console.log("    →", JSON.stringify(j(r)));
  });

  await test("POST /event/trigger — invalid event_type → 400", async () => {
    const r = await app.inject({
      method: "POST",
      url: "/event/trigger",
      headers: h,
      payload: {
        device_id: "d1",
        fence_id: "00000000-0000-0000-0000-000000000001",
        event_type: "HOVER",
      },
    });
    assert(r.statusCode === 400, `Expected 400, got ${r.statusCode}`);
    console.log("    →", JSON.stringify(j(r)));
  });

  // ── Admin ─────────────────────────────────────────────────────────────
  console.log("\nAdmin:");

  await test("POST /admin/fences — missing required fields → 400", async () => {
    const r = await app.inject({
      method: "POST",
      url: "/admin/fences",
      headers: h,
      payload: { name: "Test Site" },
    });
    assert(r.statusCode === 400, `Expected 400, got ${r.statusCode}`);
    assert(j(r)["success"] === false, "Expected success=false");
    console.log("    →", JSON.stringify(j(r)));
  });

  await test("POST /admin/campaigns — missing fields → 400", async () => {
    const r = await app.inject({
      method: "POST",
      url: "/admin/campaigns",
      headers: h,
      payload: { title: "Campaign A" },
    });
    assert(r.statusCode === 400, `Expected 400, got ${r.statusCode}`);
    console.log("    →", JSON.stringify(j(r)));
  });

  // ── Integration (DB + Redis required) ────────────────────────────────
  if (process.env.DATABASE_URL) {
    console.log("\nIntegration (DB):");

    await test("Register device → 200 with device object", async () => {
      const payload = {
        device_id: `itest-${Date.now()}`,
        platform: "android",
        app_version: "2.0.0",
        fcm_token: "fcm-test-abc",
      };
      const r = await app.inject({
        method: "POST",
        url: "/device/register",
        headers: h,
        payload,
      });
      assert(r.statusCode === 200, `Expected 200, got ${r.statusCode}`);
      const b = j(r);
      assert(b["success"] === true, "Expected success=true");
      const data = b["data"] as Body;
      assert(data["device_id"] === payload.device_id, "device_id mismatch");
      console.log("    →", JSON.stringify(b));
    });

    await test("Full pipeline: device → fence → campaign → location event → logs → stats", async () => {
      const deviceId = `pipe-${Date.now()}`;

      await app.inject({
        method: "POST", url: "/device/register", headers: h,
        payload: { device_id: deviceId, platform: "android", app_version: "1.0", fcm_token: "fcm-pipe-test" },
      });

      const fr = await app.inject({
        method: "POST", url: "/admin/fences", headers: h,
        payload: { name: "Chennai Central", latitude: 13.0827, longitude: 80.2707, radius: 1000, category: "transport", project_info: "Metro 2024" },
      });
      assert(fr.statusCode === 201, `Fence create: expected 201, got ${fr.statusCode}`);
      const fenceId = (j(fr)["data"] as Body)["id"] as string;
      console.log("    fence id:", fenceId);

      const cr = await app.inject({
        method: "POST", url: "/admin/campaigns", headers: h,
        payload: { fence_id: fenceId, title: "Transport Update", message_template: "Welcome to {{name}}!", start_date: new Date(Date.now() - 1000).toISOString() },
      });
      assert(cr.statusCode === 201, `Campaign: expected 201, got ${cr.statusCode}`);
      console.log("    campaign id:", (j(cr)["data"] as Body)["campaign_id"]);

      const lr = await app.inject({
        method: "POST", url: "/location/event", headers: h,
        payload: { device_id: deviceId, lat: 13.0827, lng: 80.2707, timestamp: Date.now() },
      });
      assert(lr.statusCode === 200, `Location: expected 200, got ${lr.statusCode}`);
      const ldata = j(lr)["data"] as Body;
      assert((ldata["matched"] as number) >= 1, "Expected >=1 fence match");
      console.log("    location →", JSON.stringify(j(lr)));

      const logsR = await app.inject({ method: "GET", url: `/event/logs?device_id=${deviceId}`, headers: h });
      const logArr = j(logsR)["data"] as unknown[];
      assert(logArr.length >= 1, "Expected >=1 log entry");
      console.log("    event logs:", logArr.length, "entries");

      const statsR = await app.inject({ method: "GET", url: `/event/stats/${fenceId}`, headers: h });
      const stats = j(statsR)["data"] as Body;
      assert((stats["total_events"] as number) >= 1, "Expected >=1 total_events");
      console.log("    stats →", JSON.stringify(stats));

      const nearbyR = await app.inject({ method: "GET", url: `/fences/nearby?lat=13.0827&lng=80.2707&radius=2000`, headers: h });
      const nearby = j(nearbyR)["data"] as unknown[];
      assert(nearby.length >= 1, "Expected >=1 nearby fence");
      console.log("    nearby fences:", nearby.length);

      await app.inject({ method: "DELETE", url: `/admin/fences/${fenceId}`, headers: h });
    });
  } else {
    console.log("\n  ⚠  DB tests skipped — set DATABASE_URL + REDIS_URL to enable");
  }

  // ─── Summary ──────────────────────────────────────────────────────────
  await app.close();
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`\n═══ ${passed} passed, ${failed} failed ═══\n`);
  if (failed > 0) {
    results.filter((r) => !r.passed).forEach((r) =>
      console.log(`  ✗ ${r.name}\n    ${r.error}`)
    );
    process.exit(1);
  }
  process.exit(0);
})();
