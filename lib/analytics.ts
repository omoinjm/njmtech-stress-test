/**
 * Pages Microsoft Clarity must never record: they show customers' vulnerability details,
 * account data, payments or one-time links. Marketing pages and the blog are tracked.
 */
export const CLARITY_PRIVATE_PREFIXES = [
  "/scans", "/admin", "/dashboard", "/domains", "/payments", "/verify-domain", "/verified", "/auth", "/login", "/api",
];

export const isPrivatePath = (path: string) =>
  CLARITY_PRIVATE_PREFIXES.some((p) => path === p || path.startsWith(p + "/") || path.startsWith(p + "?"));

/** Clarity project IDs are short lowercase alphanumerics; anything else disables tracking. */
export const validClarityId = (id: string | undefined | null): id is string => !!id && /^[a-z0-9]{6,20}$/.test(id);
