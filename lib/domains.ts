import { randomBytes } from "node:crypto";
import { resolveTxt } from "node:dns/promises";
import { eq } from "drizzle-orm";
import { getDb, t } from "./db";
import { env } from "./env";
import { createFetcher } from "./scanner/net";

export const VERIFY_TXT_PREFIX = "_njmtech-verify";
export const VERIFY_FILE_PATH = "/.well-known/njmtech-security-verify.txt";
export const VERIFICATION_TTL_DAYS = 30;

export class InputError extends Error {}

/** "Shop.Example.com/path" → { origin: "https://shop.example.com", hostname: "shop.example.com" } */
export function normalizeOrigin(input: string, allowPrivate = env.allowPrivateTargets()) {
  let s = input.trim();
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    throw new InputError("That doesn't look like a website address.");
  }
  if (!["http:", "https:"].includes(u.protocol)) throw new InputError("Only http(s) websites can be scanned.");
  if (u.username || u.password) throw new InputError("Remove credentials from the URL.");
  const hostname = u.hostname.toLowerCase();
  if (!allowPrivate && (!hostname.includes(".") || /^[\d.]+$/.test(hostname) || hostname.includes(":"))) {
    throw new InputError("Enter a public domain name (e.g. shop.example.com).");
  }
  return { origin: `${u.protocol}//${u.host.toLowerCase()}`, hostname };
}

export const newVerifyToken = () => randomBytes(16).toString("hex");

export function isVerified(d: { verifiedAt: Date | null }) {
  return !!d.verifiedAt && Date.now() - d.verifiedAt.getTime() < VERIFICATION_TTL_DAYS * 86_400_000;
}

export async function checkOwnership(d: { origin: string; hostname: string; verifyToken: string }) {
  const expected = `njmtech-verify=${d.verifyToken}`;
  try {
    const recs = (await resolveTxt(`${VERIFY_TXT_PREFIX}.${d.hostname}`)).map((r) => r.join(""));
    if (recs.some((r) => r.trim() === expected)) return "dns" as const;
  } catch {}
  try {
    const res = await createFetcher({ allowPrivate: env.allowPrivateTargets() })(d.origin + VERIFY_FILE_PATH, {
      follow: false,
      maxBytes: 1024,
      timeoutMs: 8000,
    });
    if (res.status === 200 && res.body.trim() === expected) return "file" as const;
  } catch {}
  return null;
}

export async function verifyDomain(domainId: string, userId: string) {
  const db = await getDb();
  const d = await db.query.domains.findFirst({ where: eq(t.domains.id, domainId) });
  if (!d || d.userId !== userId) return { ok: false as const, reason: "not_found" };
  const method = await checkOwnership(d);
  if (!method) return { ok: false as const, reason: "not_found_record" };
  await db.update(t.domains).set({ verifiedAt: new Date(), verifyMethod: method }).where(eq(t.domains.id, d.id));
  return { ok: true as const, method };
}

export async function addDomain(userId: string, input: string) {
  const db = await getDb();
  const { origin, hostname } = normalizeOrigin(input);
  const [row] = await db
    .insert(t.domains)
    .values({ userId, origin, hostname, verifyToken: newVerifyToken() })
    .onConflictDoUpdate({ target: [t.domains.userId, t.domains.origin], set: { origin } })
    .returning();
  return row;
}
