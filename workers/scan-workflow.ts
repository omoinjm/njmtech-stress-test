import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import { createDb } from "../lib/db";
import type { LoadTestSummary } from "../lib/db/schema";
import { CHECK_KEYS } from "../lib/scanner/check-keys";
import { loadFindings, planShards, runLoadRaw, type ShardPlan } from "../lib/scanner/checks/load-test";
import { assertPublicHost } from "../lib/scanner/net";
import {
  bumpProgress, collectShards, failScan, fetchHomeSafe, markRunning, notify, runCheckSafe, saveResults, saveShard,
} from "../lib/scanner/pipeline";

export type LoadShardParams = { scanId: string; origin: string; allowPrivate: boolean; plan: ShardPlan };

const NO_RETRY = { retries: { limit: 0, delay: "1 second" as const }, timeout: "5 minutes" as const };

/**
 * Durable scan: every check is its own step (persisted, retried independently, run in parallel).
 * The optional load test fans out to LoadShardWorkflow instances because a single Worker
 * invocation can only hold 6 outbound connections open at once.
 */
export class ScanWorkflow extends WorkflowEntrypoint<CloudflareEnv, { scanId: string }> {
  async run(event: WorkflowEvent<{ scanId: string }>, step: WorkflowStep) {
    const { scanId } = event.payload;
    const db = createDb(this.env.DB);

    const target = await step.do("mark running", () => markRunning(db, scanId));
    const { home, error } = await step.do("fetch homepage", { retries: { limit: 1, delay: "5 seconds" } }, () =>
      fetchHomeSafe(target.origin, target.allowPrivate),
    );
    if (!home) {
      await step.do("record failure", () => failScan(db, scanId, `Could not reach ${target.origin}: ${error}`));
      return { status: "failed" };
    }

    const args = { origin: target.origin, hostname: target.hostname, home, allowPrivate: target.allowPrivate };
    const results = await Promise.all(
      CHECK_KEYS.map((key) => step.do(`check ${key}`, { retries: { limit: 2, delay: "5 seconds" } }, () => runCheckSafe(db, scanId, key, args))),
    );
    const raw = results.flat();

    let load: LoadTestSummary | null = null;
    if (target.includeLoadTest) {
      const plans = planShards();
      const started = await step.do("start load shards", NO_RETRY, async () => {
        try {
          await assertPublicHost(target.hostname, target.allowPrivate);
        } catch {
          return false;
        }
        await this.env.LOAD_SHARD_WORKFLOW.createBatch(
          plans.map((plan) => ({
            id: `${scanId}-load-${plan.shard}`,
            params: { scanId, origin: target.origin, allowPrivate: target.allowPrivate, plan },
          })),
        );
        return true;
      });
      if (started) {
        await step.sleep("wait for load test", Math.max(...plans.map((p) => p.startDelayMs + p.durationMs)) + 15_000);
        try {
          load = await step.do("collect load results", { retries: { limit: 6, delay: "10 seconds", backoff: "constant" } }, () =>
            collectShards(db, scanId, plans.length, true),
          );
        } catch {
          load = await step.do("collect partial load results", () => collectShards(db, scanId, plans.length, false));
        }
        if (load) raw.push(...loadFindings(load));
      }
      await step.do("load progress", () => bumpProgress(db, scanId));
    }

    await step.do("save results", () => saveResults(db, scanId, raw, load));
    await step.do("notify", { retries: { limit: 3, delay: "30 seconds", backoff: "exponential" } }, () => notify(db, scanId, target));
    return { status: "done", findings: raw.length };
  }
}

/** One slice of the load test: ≤6 concurrent connections, started staggered to form a ramp. */
export class LoadShardWorkflow extends WorkflowEntrypoint<CloudflareEnv, LoadShardParams> {
  async run(event: WorkflowEvent<LoadShardParams>, step: WorkflowStep) {
    const { scanId, origin, plan } = event.payload;
    if (plan.startDelayMs > 0) await step.sleep("ramp delay", plan.startDelayMs);
    // Never retried: a load test must not be silently repeated against a customer's site.
    await step.do("run shard", NO_RETRY, async () => {
      const r = await runLoadRaw(origin + "/", {
        maxConcurrency: plan.concurrency,
        durationMs: plan.durationMs,
        maxRequests: plan.maxRequests,
        ramp: false,
      });
      await saveShard(createDb(this.env.DB), scanId, plan.shard, r);
      return { requests: r.latencies.length, errors: r.errors, aborted: r.aborted };
    });
  }
}
