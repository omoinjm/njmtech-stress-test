import type { LoadTestSummary } from "../../db/schema";
import type { RawFinding } from "../types";
import { USER_AGENT } from "../net";

/** Hard safety caps. Deliberately conservative: we measure resilience, we don't take sites down. */
export const LOAD_LIMITS = {
  maxConcurrency: 50,
  durationMs: 30_000,
  maxRequests: 3_000,
  requestTimeoutMs: 10_000,
  /** Stop once at least `minSample` requests are done and the error rate exceeds this. */
  abortErrorRate: 0.2,
  minSample: 30,
};

/** Cloudflare Workers allow 6 simultaneous outbound connections per invocation, so the load is split into shards. */
export const CONNECTIONS_PER_SHARD = 6;

export type LoadOpts = Partial<typeof LOAD_LIMITS> & {
  fetchImpl?: typeof fetch;
  /** Ramp virtual users up over the first half (single-process mode). Shards start at full width instead. */
  ramp?: boolean;
};

export type RawLoad = { latencies: number[]; errors: number; peak: number; durationMs: number; aborted: boolean };

export type ShardPlan = { shard: number; concurrency: number; startDelayMs: number; durationMs: number; maxRequests: number };

/** Split the capped load into shards that start staggered, which gives a ramp from ~6 to 50 users. */
export function planShards(): ShardPlan[] {
  const { maxConcurrency, durationMs, maxRequests } = LOAD_LIMITS;
  const n = Math.ceil(maxConcurrency / CONNECTIONS_PER_SHARD);
  const rampMs = durationMs / 2;
  return Array.from({ length: n }, (_, i) => {
    const concurrency = Math.min(CONNECTIONS_PER_SHARD, maxConcurrency - i * CONNECTIONS_PER_SHARD);
    const startDelayMs = Math.round((i * rampMs) / n);
    return {
      shard: i,
      concurrency,
      startDelayMs,
      durationMs: durationMs - startDelayMs,
      maxRequests: Math.floor((maxRequests * concurrency) / maxConcurrency),
    };
  });
}

const pct = (sorted: number[], p: number) =>
  sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))] : 0;

/** Runs sequential GETs from N virtual users. Caps are clamped: callers can't exceed LOAD_LIMITS. */
export async function runLoadRaw(url: string, opts: LoadOpts = {}): Promise<RawLoad> {
  const maxConcurrency = Math.min(opts.maxConcurrency ?? LOAD_LIMITS.maxConcurrency, LOAD_LIMITS.maxConcurrency);
  const durationMs = Math.min(opts.durationMs ?? LOAD_LIMITS.durationMs, LOAD_LIMITS.durationMs);
  const maxRequests = Math.min(opts.maxRequests ?? LOAD_LIMITS.maxRequests, LOAD_LIMITS.maxRequests);
  const requestTimeoutMs = opts.requestTimeoutMs ?? LOAD_LIMITS.requestTimeoutMs;
  const abortErrorRate = opts.abortErrorRate ?? LOAD_LIMITS.abortErrorRate;
  const minSample = opts.minSample ?? LOAD_LIMITS.minSample;
  const ramp = opts.ramp ?? true;
  const doFetch = opts.fetchImpl ?? fetch;

  const start = Date.now();
  const latencies: number[] = [];
  let errors = 0, launched = 0, active = 0, peak = 0, aborted = false;
  const stop = () => aborted || Date.now() - start >= durationMs || launched >= maxRequests;
  const targetVUs = () => {
    if (!ramp) return maxConcurrency;
    const r = Math.min(1, (Date.now() - start) / (durationMs / 2));
    return Math.max(Math.min(5, maxConcurrency), Math.round(5 + (maxConcurrency - 5) * r));
  };

  async function vu(id: number) {
    while (!stop()) {
      if (id >= targetVUs()) {
        await new Promise((r) => setTimeout(r, 200));
        continue;
      }
      launched++;
      active++;
      peak = Math.max(peak, active);
      const t0 = Date.now();
      try {
        const res = await doFetch(url, {
          headers: { "user-agent": USER_AGENT, "cache-control": "no-cache" },
          redirect: "manual",
          signal: AbortSignal.timeout(requestTimeoutMs),
        });
        await res.arrayBuffer().catch(() => {});
        if (res.status >= 500 || res.status === 429) errors++;
      } catch {
        errors++;
      } finally {
        active--;
        latencies.push(Date.now() - t0);
      }
      if (latencies.length >= minSample && errors / latencies.length > abortErrorRate) aborted = true;
    }
  }

  await Promise.all(Array.from({ length: maxConcurrency }, (_, i) => vu(i)));
  return { latencies, errors, peak, durationMs: Date.now() - start, aborted };
}

export function summarize(parts: RawLoad[], wallMs?: number): LoadTestSummary {
  const all = parts.flatMap((p) => p.latencies).sort((a, b) => a - b);
  const errors = parts.reduce((s, p) => s + p.errors, 0);
  const durationMs = wallMs ?? Math.max(1, ...parts.map((p) => p.durationMs));
  const requests = all.length;
  return {
    requests,
    errors,
    errorRate: requests ? errors / requests : 0,
    p50Ms: Math.round(pct(all, 50)),
    p95Ms: Math.round(pct(all, 95)),
    maxMs: Math.round(all.at(-1) ?? 0),
    rps: Math.round((requests / (durationMs / 1000)) * 10) / 10,
    peakConcurrency: parts.reduce((s, p) => s + p.peak, 0),
    durationMs,
    abortedEarly: parts.some((p) => p.aborted),
  };
}

/** Single-process load test (local dev / tests). */
export async function runLoadTest(url: string, opts: LoadOpts = {}): Promise<LoadTestSummary> {
  return summarize([await runLoadRaw(url, opts)]);
}

export function loadFindings(s: LoadTestSummary): RawFinding[] {
  const stats = `${s.requests} requests, up to ${s.peakConcurrency} concurrent users, error rate ${(s.errorRate * 100).toFixed(1)}%, p50 ${s.p50Ms} ms, p95 ${s.p95Ms} ms`;
  if (s.errorRate > 0.05 || s.abortedEarly) {
    return [{ key: "load.high-error-rate", evidence: stats + (s.abortedEarly ? " (test stopped early to protect the site)" : "") }];
  }
  if (s.p95Ms > 3000) return [{ key: "load.slow", evidence: stats }];
  return [];
}
