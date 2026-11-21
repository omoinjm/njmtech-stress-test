/** Dependency-free list of check keys (safe to import from the workflow sandbox). */
export const CHECK_KEYS = [
  "tls",
  "headers",
  "cookies",
  "exposed-files",
  "cms",
  "cors",
  "email-dns",
  "mixed-content",
  "info-leak",
] as const;
