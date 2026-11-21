import type { Severity } from "../db/schema";

export type { Severity };

/** Minimal response shape the checks work with (serializable, easy to fake in tests). */
export type HttpResult = {
  url: string;
  status: number;
  headers: Record<string, string>;
  setCookies: string[];
  body: string;
};

export type FetchOpts = {
  method?: "GET" | "HEAD" | "OPTIONS";
  headers?: Record<string, string>;
  /** Follow redirects (default true, max 5 hops, each hop re-validated). */
  follow?: boolean;
  timeoutMs?: number;
  maxBytes?: number;
};

export type Fetcher = (url: string, opts?: FetchOpts) => Promise<HttpResult>;

export type CheckContext = {
  origin: string; // "https://example.com"
  hostname: string; // "example.com"
  fetch: Fetcher;
  /** The homepage response, fetched once by the orchestrator. */
  home: HttpResult;
};

/** What a check emits: a catalog key plus the concrete evidence seen on this site. */
export type RawFinding = { key: string; evidence: string };

export type Check = {
  key: string;
  label: string;
  run: (ctx: CheckContext) => Promise<RawFinding[]>;
};

export type Finding = {
  key: string;
  severity: Severity;
  title: string;
  evidence: string;
  impact: string;
  fix: string;
  diyFriendly: boolean;
};

export const SEVERITY_ORDER: Severity[] = ["critical", "high", "medium", "low", "info"];
export const severityRank = (s: Severity) => SEVERITY_ORDER.indexOf(s);
