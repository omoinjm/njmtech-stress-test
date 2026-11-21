import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getDb, t } from "./db";
import { sendEmail } from "./email";
import { env } from "./env";

const COOKIE = "st_session";
const SESSION_DAYS = 14;
const LOGIN_TOKEN_MINUTES = 20;

export type SessionUser = { id: string; email: string; isAdmin: boolean };

const secret = () => {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET must be set (≥32 chars)");
  return s;
};
const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export const normalizeEmail = (e: string) => e.trim().toLowerCase();

/** Returns false when rate-limited (5 links per email per hour). */
export async function sendMagicLink(rawEmail: string, redirectTo = "/dashboard"): Promise<boolean> {
  const db = await getDb();
  const email = normalizeEmail(rawEmail);
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)` })
    .from(t.loginTokens)
    .where(and(eq(t.loginTokens.email, email), gt(t.loginTokens.createdAt, new Date(Date.now() - 3_600_000))));
  if (n >= 5) return false;

  const token = randomBytes(32).toString("base64url");
  await db.insert(t.loginTokens).values({
    tokenHash: sha256(token),
    email,
    redirectTo: redirectTo.startsWith("/") && !redirectTo.startsWith("//") ? redirectTo : "/dashboard",
    expiresAt: new Date(Date.now() + LOGIN_TOKEN_MINUTES * 60_000),
  });
  const link = `${env.appUrl()}/auth/callback?token=${token}`;
  await sendEmail({
    to: email,
    subject: "Your sign-in link for the Security Scan",
    text: `Click to sign in (valid for ${LOGIN_TOKEN_MINUTES} minutes):\n\n${link}\n\nIf you didn't request this, ignore this email.`,
  });
  return true;
}

/** Consumes a one-time token, upserts the user, and sets the session cookie. Returns the redirect path. */
export async function consumeMagicLink(token: string): Promise<string | null> {
  const db = await getDb();
  const [row] = await db
    .update(t.loginTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(t.loginTokens.tokenHash, sha256(token)),
        isNull(t.loginTokens.usedAt),
        gt(t.loginTokens.expiresAt, new Date()),
      ),
    )
    .returning();
  if (!row) return null;

  const [user] = await db
    .insert(t.users)
    .values({ email: row.email })
    .onConflictDoUpdate({ target: t.users.email, set: { email: row.email } })
    .returning();

  const exp = Date.now() + SESSION_DAYS * 86_400_000;
  const payload = `${user.id}.${exp}`;
  (await cookies()).set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(exp),
  });
  return row.redirectTo ?? "/dashboard";
}

export async function getUser(): Promise<SessionUser | null> {
  await connection(); // session checks compare against the current time: always request-time
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const [id, exp, sig] = raw.split(".");
  if (!id || !exp || !sig) return null;
  const expected = Buffer.from(sign(`${id}.${exp}`));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  if (Number(exp) < Date.now()) return null;
  const db = await getDb();
  const user = await db.query.users.findFirst({ where: eq(t.users.id, id) });
  if (!user) return null;
  return { id: user.id, email: user.email, isAdmin: env.adminEmails().includes(user.email) };
}

export async function requireUser(next = "/dashboard"): Promise<SessionUser> {
  const u = await getUser();
  if (!u) redirect(`/login?next=${encodeURIComponent(next)}`);
  return u;
}

export async function requireAdmin(): Promise<SessionUser> {
  const u = await requireUser("/admin");
  if (!u.isAdmin) redirect("/dashboard");
  return u;
}

export async function signOut() {
  (await cookies()).delete(COOKIE);
}
