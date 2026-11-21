import { createServer, type Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { LOAD_LIMITS, loadFindings, runLoadTest } from "@/lib/scanner/checks/load-test";

let server: Server;
let base = "";
let mode: "ok" | "failing" = "ok";
let maxInFlight = 0;
let inFlight = 0;

beforeAll(async () => {
  server = createServer((_req, res) => {
    inFlight++;
    maxInFlight = Math.max(maxInFlight, inFlight);
    setTimeout(() => {
      inFlight--;
      res.statusCode = mode === "failing" ? 503 : 200;
      res.end("ok");
    }, 20);
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const addr = server.address() as { port: number };
  base = `http://127.0.0.1:${addr.port}/`;
});
afterAll(() => server.close());

describe("load test safety caps", () => {
  it("never exceeds concurrency/request caps even if asked to", async () => {
    mode = "ok";
    maxInFlight = 0;
    const s = await runLoadTest(base, { maxConcurrency: 10_000, durationMs: 3000, maxRequests: 200 });
    expect(s.peakConcurrency).toBeLessThanOrEqual(LOAD_LIMITS.maxConcurrency);
    expect(maxInFlight).toBeLessThanOrEqual(LOAD_LIMITS.maxConcurrency);
    expect(s.requests).toBeLessThanOrEqual(200 + LOAD_LIMITS.maxConcurrency);
    expect(s.errorRate).toBe(0);
    expect(loadFindings(s)).toEqual([]);
  });

  it("aborts early when the target starts failing", async () => {
    mode = "failing";
    const t0 = Date.now();
    const s = await runLoadTest(base, { durationMs: 20_000 });
    expect(s.abortedEarly).toBe(true);
    expect(Date.now() - t0).toBeLessThan(5_000);
    expect(loadFindings(s).map((f) => f.key)).toEqual(["load.high-error-rate"]);
  });
});

import { CONNECTIONS_PER_SHARD, planShards, summarize } from "@/lib/scanner/checks/load-test";

describe("load shards (Cloudflare 6-connection limit)", () => {
  it("splits 50 users into shards of ≤6 that start staggered and end together", () => {
    const plans = planShards();
    expect(plans.reduce((s, p) => s + p.concurrency, 0)).toBe(LOAD_LIMITS.maxConcurrency);
    expect(plans.every((p) => p.concurrency <= CONNECTIONS_PER_SHARD)).toBe(true);
    expect(plans.reduce((s, p) => s + p.maxRequests, 0)).toBeLessThanOrEqual(LOAD_LIMITS.maxRequests);
    for (const p of plans) expect(p.startDelayMs + p.durationMs).toBe(LOAD_LIMITS.durationMs);
    expect(plans[0].startDelayMs).toBe(0);
    expect(plans.at(-1)!.startDelayMs).toBeLessThan(LOAD_LIMITS.durationMs / 2);
  });
  it("aggregates shard percentiles and aborts", () => {
    const s = summarize([
      { latencies: [100, 200, 300], errors: 0, peak: 6, durationMs: 1000, aborted: false },
      { latencies: [400, 5000], errors: 2, peak: 4, durationMs: 1000, aborted: true },
    ]);
    expect(s.requests).toBe(5);
    expect(s.peakConcurrency).toBe(10);
    expect(s.errorRate).toBeCloseTo(0.4);
    expect(s.maxMs).toBe(5000);
    expect(s.abortedEarly).toBe(true);
  });
});
