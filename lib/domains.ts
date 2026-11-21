import { createHash, randomBytes } from "node:crypto";
import { resolveTxt } from "node:dns/promises";
import { and, count, eq, gt, isNull } from "drizzle-orm";
import { getDb, t } from "./db";
import { env, isAdminEmail } from "./env";
import { sendEmail } from "./email";
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
  // Zero-click: the account email itself is an admin mailbox for this domain (proven by magic link).
  if (!isVerified(row)) {
    const user = await db.query.users.findFirst({ where: eq(t.users.id, userId) });
    if (user && emailQualifiesFor(user.email, hostname)) {
      const [v] = await db
        .update(t.domains)
        .set({ verifiedAt: new Date(), verifyMethod: "email" })
        .where(eq(t.domains.id, row.id))
        .returning();
      return v;
    }
  }
  return row;
}

// ---------- One-click email verification ----------
// Proof: someone with a mailbox AT the website's own domain approves the deep scan. The requester
// can't send the approval to an outside address (they'd just approve themselves).

/** Suggested mailboxes (the CA/Browser Forum "constructed" admin addresses, plus common ones). */
export const SUGGESTED_LOCAL_PARTS = ["info", "admin", "hello", "contact", "webmaster", "postmaster"] as const;

/** Domains whose mailboxes are handed out to the public: a mailbox there proves nothing about a site. */
const FREE_MAIL = new Set([
  "gmail.com", "googlemail.com", "outlook.com", "hotmail.com", "live.com", "msn.com", "yahoo.com", "ymail.com",
  "icloud.com", "me.com", "mac.com", "aol.com", "proton.me", "protonmail.com", "gmx.com", "gmx.net", "mail.com",
  "zoho.com", "yandex.com", "yandex.ru", "fastmail.com", "tutanota.com", "hey.com", "webmail.co.za", "mweb.co.za",
  "telkomsa.net", "vodamail.co.za", "iafrica.com", "lantic.net",
]);

/** Free-mail and similar providers can't be verified by email (use DNS/file instead). */
export const emailVerificationAllowed = (hostname: string) =>
  hostname.includes(".") && !/^[\d.]+$/.test(hostname) && !FREE_MAIL.has(registrableDomain(hostname));

// Second-level labels used under 2-letter ccTLDs (co.za, com.au, org.uk, …).
const SLD = new Set(["co", "com", "org", "net", "gov", "ac", "edu", "nom", "web", "ltd", "plc", "mil", "or", "ne", "go"]);

/** The registrable domain, e.g. shop.example.co.za → example.co.za, www.example.com → example.com. */
export function registrableDomain(hostname: string): string {
  const labels = hostname.toLowerCase().replace(/\.$/, "").split(".");
  if (labels.length <= 2) return labels.join(".");
  const tld = labels.at(-1)!;
  const sld = labels.at(-2)!;
  const take = tld.length === 2 && SLD.has(sld) ? 3 : 2;
  return labels.slice(-take).join(".");
}

/** Candidate authorization domains: the host and each parent down to the registrable domain. */
export function authorizationDomains(hostname: string): string[] {
  const host = hostname.toLowerCase().replace(/^www\./, "");
  const base = registrableDomain(host);
  const out: string[] = [];
  let cur = host;
  while (cur.length >= base.length && cur.endsWith(base)) {
    out.push(cur);
    if (cur === base) break;
    cur = cur.slice(cur.indexOf(".") + 1);
  }
  return out.length ? out : [base];
}

/** Any real mailbox at the site's domain (or a parent of it, down to the registrable domain). */
export function emailQualifiesFor(email: string, hostname: string): boolean {
  if (!emailVerificationAllowed(hostname)) return false;
  const m = email.trim().toLowerCase().match(/^([a-z0-9._%+-]{1,64})@([a-z0-9.-]+)$/);
  return !!m && authorizationDomains(hostname).includes(m[2]);
}

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const VERIFY_LINK_MINUTES = 60 * 24;

export async function sendDomainVerificationEmail(domainId: string, userId: string, email: string) {
  const db = await getDb();
  const d = await db.query.domains.findFirst({ where: and(eq(t.domains.id, domainId), eq(t.domains.userId, userId)) });
  if (!d) throw new InputError("Website not found.");
  const to = email.trim().toLowerCase();
  if (!emailQualifiesFor(to, d.hostname))
    throw new InputError(`The approval must go to a mailbox at ${registrableDomain(d.hostname)}, so someone inside the business approves it.`);

  const [{ n }] = await db
    .select({ n: count() })
    .from(t.domainVerifications)
    .where(and(eq(t.domainVerifications.domainId, d.id), gt(t.domainVerifications.createdAt, new Date(Date.now() - 3_600_000))));
  const requesterIsOwner = isAdminEmail((await db.query.users.findFirst({ where: eq(t.users.id, userId) }))?.email);
  if (!requesterIsOwner && n >= 5) throw new InputError("Too many verification emails for this site. Try again in an hour.");

  const token = randomBytes(32).toString("base64url");
  await db.insert(t.domainVerifications).values({
    tokenHash: sha256(token),
    domainId: d.id,
    email: to,
    expiresAt: new Date(Date.now() + VERIFY_LINK_MINUTES * 60_000),
  });
  const requester = await db.query.users.findFirst({ where: eq(t.users.id, userId) });
  await sendEmail({
    to,
    subject: `Approve a security scan of ${d.hostname}`,
    text:
      `${requester?.email ?? "Someone"} asked NJM Tech Security to run a deep security scan and stress test of ${d.origin}.\n\n` +
      `If this is you (or you approve it), confirm with one click (valid 24 hours):\n\n${env.appUrl()}/verify-domain?token=${token}\n\n` +
      `If you don't recognise this request, ignore this email. Nothing will be scanned without approval.\n\nNJM Tech Security`,
  });
  return to;
}

export async function confirmDomainVerification(token: string) {
  const db = await getDb();
  const [row] = await db
    .update(t.domainVerifications)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(t.domainVerifications.tokenHash, sha256(token)),
        isNull(t.domainVerifications.usedAt),
        gt(t.domainVerifications.expiresAt, new Date()),
      ),
    )
    .returning();
  if (!row) return null;
  await db.update(t.domains).set({ verifiedAt: new Date(), verifyMethod: "email" }).where(eq(t.domains.id, row.domainId));
  return db.query.domains.findFirst({ where: eq(t.domains.id, row.domainId) });
}
