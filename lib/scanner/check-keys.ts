import type { ScanKind } from "../db/schema";

/**
 * Dependency-free registry of check keys and the scan kind that may run them.
 * "public": only reads what any visitor's browser already receives (homepage response, TLS
 *           handshake, public DNS). Safe to run without ownership verification.
 * "deep":   actively requests non-linked paths or endpoints, or adds load. Verified owners only.
 */
export const CHECK_MODES = {
  tls: "public",
  headers: "public",
  cookies: "public",
  cms: "public",
  "email-dns": "public",
  "mixed-content": "public",
  "info-leak": "public",
  "exposed-files": "deep",
  wordpress: "deep",
  cors: "deep",
} as const satisfies Record<string, ScanKind>;

export type CheckKey = keyof typeof CHECK_MODES;
export const CHECK_KEYS = Object.keys(CHECK_MODES) as CheckKey[];

export function checkKeysFor(kind: ScanKind): CheckKey[] {
  return kind === "deep" ? CHECK_KEYS : CHECK_KEYS.filter((k) => CHECK_MODES[k] === "public");
}
