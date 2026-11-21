import { sqliteTable, text, integer, uniqueIndex, index } from "drizzle-orm/sqlite-core";

const id = () => text("id").primaryKey().$defaultFn(() => crypto.randomUUID());
const ts = (name: string) => integer(name, { mode: "timestamp_ms" });
const createdAt = () => ts("created_at").notNull().$defaultFn(() => new Date());

export const users = sqliteTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  termsAcceptedAt: ts("terms_accepted_at"),
  createdAt: createdAt(),
});

export const loginTokens = sqliteTable(
  "login_tokens",
  {
    tokenHash: text("token_hash").primaryKey(),
    email: text("email").notNull(),
    redirectTo: text("redirect_to"),
    expiresAt: ts("expires_at").notNull(),
    usedAt: ts("used_at"),
    createdAt: createdAt(),
  },
  (t) => [index("login_tokens_email").on(t.email, t.createdAt)],
);

export const domains = sqliteTable(
  "domains",
  {
    id: id(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    /** e.g. "https://shop.example.com" (scheme + host + optional port) */
    origin: text("origin").notNull(),
    hostname: text("hostname").notNull(),
    verifyToken: text("verify_token").notNull(),
    verifiedAt: ts("verified_at"),
    verifyMethod: text("verify_method", { enum: ["dns", "file", "email"] }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("domains_user_origin").on(t.userId, t.origin)],
);

/** One-click ownership proof: link emailed to admin@/webmaster@/… at the domain (CA/B Forum style). */
export const domainVerifications = sqliteTable(
  "domain_verifications",
  {
    tokenHash: text("token_hash").primaryKey(),
    domainId: text("domain_id").notNull().references(() => domains.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    expiresAt: ts("expires_at").notNull(),
    usedAt: ts("used_at"),
    createdAt: createdAt(),
  },
  (t) => [index("domain_verifications_domain").on(t.domainId, t.createdAt)],
);

export type ScanStatus = "queued" | "running" | "done" | "failed";
/** public = passive checks anyone's browser could do (no verification); deep = probes + stress test (verified only). */
export type ScanKind = "public" | "deep";

export type LoadTestSummary = {
  requests: number;
  errors: number;
  errorRate: number;
  p50Ms: number;
  p95Ms: number;
  maxMs: number;
  rps: number;
  peakConcurrency: number;
  durationMs: number;
  abortedEarly: boolean;
};

export const scans = sqliteTable(
  "scans",
  {
    id: id(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    domainId: text("domain_id").notNull().references(() => domains.id, { onDelete: "cascade" }),
    origin: text("origin").notNull(),
    status: text("status").$type<ScanStatus>().notNull().default("queued"),
    kind: text("kind").$type<ScanKind>().notNull().default("deep"),
    /** Unguessable token so the requester can view a public scan before signing in. */
    accessToken: text("access_token"),
    includeLoadTest: integer("include_load_test", { mode: "boolean" }).notNull().default(false),
    requesterIp: text("requester_ip"),
    runId: text("run_id"),
    progress: integer("progress").notNull().default(0),
    loadTest: text("load_test", { mode: "json" }).$type<LoadTestSummary | null>(),
    error: text("error"),
    /** Set when the customer pays to unlock the full report. */
    unlockedAt: ts("unlocked_at"),
    createdAt: createdAt(),
    finishedAt: ts("finished_at"),
  },
  (t) => [index("scans_user_created").on(t.userId, t.createdAt), index("scans_domain").on(t.domainId)],
);

/** One row per load-test shard (each shard is its own Workflow instance → own connection budget). */
export const loadShards = sqliteTable(
  "load_shards",
  {
    scanId: text("scan_id").notNull().references(() => scans.id, { onDelete: "cascade" }),
    shard: integer("shard").notNull(),
    latencies: text("latencies", { mode: "json" }).$type<number[]>().notNull(),
    errors: integer("errors").notNull(),
    peak: integer("peak").notNull(),
    durationMs: integer("duration_ms").notNull(),
    aborted: integer("aborted", { mode: "boolean" }).notNull(),
  },
  (t) => [uniqueIndex("load_shards_pk").on(t.scanId, t.shard)],
);

export type Severity = "critical" | "high" | "medium" | "low" | "info";

export const findings = sqliteTable(
  "findings",
  {
    id: id(),
    scanId: text("scan_id").notNull().references(() => scans.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    severity: text("severity").$type<Severity>().notNull(),
    title: text("title").notNull(),
    evidence: text("evidence").notNull(),
    impact: text("impact").notNull(),
    fix: text("fix").notNull(),
    diyFriendly: integer("diy_friendly", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [index("findings_scan").on(t.scanId)],
);

export type LeadStatus = "new" | "contacted" | "quoted" | "paid" | "won" | "lost";

export const leads = sqliteTable("leads", {
  id: id(),
  scanId: text("scan_id").notNull().references(() => scans.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  phone: text("phone"),
  company: text("company"),
  message: text("message"),
  status: text("status").$type<LeadStatus>().notNull().default("new"),
  /** Fixed price for the fix work, set by admin (ZAR cents). */
  quoteCents: integer("quote_cents"),
  quoteNote: text("quote_note"),
  createdAt: createdAt(),
});

export type PaymentKind = "report_unlock" | "fix";
export type PaymentStatus = "pending" | "paid" | "failed" | "cancelled";

export const payments = sqliteTable(
  "payments",
  {
    id: id(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    scanId: text("scan_id").notNull().references(() => scans.id, { onDelete: "cascade" }),
    leadId: text("lead_id").references(() => leads.id, { onDelete: "set null" }),
    kind: text("kind").$type<PaymentKind>().notNull(),
    amountCents: integer("amount_cents").notNull(),
    status: text("status").$type<PaymentStatus>().notNull().default("pending"),
    yocoCheckoutId: text("yoco_checkout_id").unique(),
    yocoPaymentId: text("yoco_payment_id"),
    mode: text("mode"), // "test" | "live" as reported by Yoco
    createdAt: createdAt(),
    paidAt: ts("paid_at"),
  },
  (t) => [index("payments_scan").on(t.scanId)],
);
