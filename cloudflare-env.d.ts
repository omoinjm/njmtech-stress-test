// Bindings + vars available on `env` (Worker) and via getCloudflareContext() (Next.js).
interface CloudflareEnv {
  DB: D1Database;
  SCAN_WORKFLOW: Workflow<{ scanId: string }>;
  LOAD_SHARD_WORKFLOW: Workflow<import("./workers/scan-workflow").LoadShardParams>;
  ASSETS: Fetcher;
  WORKER_SELF_REFERENCE: Fetcher;
  APP_URL: string;
  EMAIL_FROM: string;
  EMAIL_REPLY_TO: string;
  ADMIN_EMAILS: string;
  REPORT_PRICE_CENTS: string;
  SESSION_SECRET: string;
  RESEND_API_KEY: string;
  YOCO_SECRET_KEY: string;
  YOCO_WEBHOOK_SECRET: string;
  ALLOW_PRIVATE_TARGETS?: string;
  SANITY_PROJECT_ID: string;
  SANITY_DATASET: string;
  SANITY_API_READ_TOKEN: string;
  CLARITY_PROJECT_ID: string;
}
