import { and, eq } from "drizzle-orm";
import { getDb, t, type DB } from "./db";
import type { PaymentKind } from "./db/schema";
import { sendEmail } from "./email";
import { env, formatZar } from "./env";
import { createCheckout, getCheckout, type YocoCheckout } from "./yoco";

export class PaymentError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Creates a pending payment + Yoco checkout. Amounts are always decided server-side. */
export async function startPayment(userId: string, scanId: string, kind: PaymentKind) {
  const db = await getDb();
  const scan = await db.query.scans.findFirst({ where: and(eq(t.scans.id, scanId), eq(t.scans.userId, userId)) });
  if (!scan || scan.status !== "done") throw new PaymentError(404, "Report not found.");

  let amountCents: number;
  let leadId: string | null = null;
  if (kind === "report_unlock") {
    if (scan.unlockedAt) throw new PaymentError(409, "This report is already unlocked.");
    amountCents = env.reportPriceCents();
  } else {
    const lead = await db.query.leads.findFirst({ where: eq(t.leads.scanId, scanId) });
    if (!lead?.quoteCents || lead.status !== "quoted") throw new PaymentError(409, "There is no open quote for this report yet.");
    amountCents = lead.quoteCents;
    leadId = lead.id;
  }

  const [payment] = await db.insert(t.payments).values({ userId, scanId, leadId, kind, amountCents }).returning();
  const back = `${env.appUrl()}/payments/return?pid=${payment.id}`;
  const checkout = await createCheckout({
    amountCents,
    successUrl: `${back}&result=success`,
    cancelUrl: `${back}&result=cancel`,
    failureUrl: `${back}&result=failure`,
    metadata: { paymentId: payment.id, scanId, kind },
    externalId: payment.id,
    idempotencyKey: payment.id,
  });
  await db.update(t.payments).set({ yocoCheckoutId: checkout.id }).where(eq(t.payments.id, payment.id));
  return checkout.redirectUrl;
}

/**
 * Idempotently settles a payment once Yoco confirms it (webhook or return-page lookup).
 * Never trusts the browser redirect alone: the checkout status is read from Yoco's API.
 */
export async function settlePayment(db: DB, paymentId: string, checkout: YocoCheckout) {
  const payment = await db.query.payments.findFirst({ where: eq(t.payments.id, paymentId) });
  if (!payment || payment.yocoCheckoutId !== checkout.id) return { ok: false as const, reason: "mismatch" };
  if (payment.status === "paid") return { ok: true as const, payment };
  if (checkout.status !== "completed" || checkout.amount !== payment.amountCents || checkout.currency !== "ZAR") {
    return { ok: false as const, reason: checkout.status };
  }

  const now = new Date();
  // Conditional update guards against double-processing (webhook + return page racing).
  const updated = await db
    .update(t.payments)
    .set({ status: "paid", paidAt: now, yocoPaymentId: checkout.paymentId, mode: checkout.processingMode ?? null })
    .where(and(eq(t.payments.id, paymentId), eq(t.payments.status, "pending")))
    .returning();
  if (updated.length === 0) return { ok: true as const, payment };

  if (payment.kind === "report_unlock") {
    await db.update(t.scans).set({ unlockedAt: now }).where(eq(t.scans.id, payment.scanId));
  } else if (payment.leadId) {
    await db.update(t.leads).set({ status: "paid" }).where(eq(t.leads.id, payment.leadId));
  }

  const user = await db.query.users.findFirst({ where: eq(t.users.id, payment.userId) });
  const scan = await db.query.scans.findFirst({ where: eq(t.scans.id, payment.scanId) });
  const host = scan ? new URL(scan.origin).host : "your site";
  const what = payment.kind === "report_unlock" ? `Full security report for ${host}` : `Security fixes for ${host}`;
  if (user) {
    await sendEmail({
      to: user.email,
      subject: `Payment received: ${what}`,
      text:
        `Thank you, we received ${formatZar(payment.amountCents)} for: ${what}.\n\n` +
        (payment.kind === "report_unlock"
          ? `Your full report is unlocked: ${env.appUrl()}/scans/${payment.scanId}`
          : `Our team will start on your fixes and keep you updated by email.`) +
        `\n\nReference: ${payment.id}\nNJM Tech Security`,
    }).catch((e) => console.error("receipt email failed", e));
  }
  for (const admin of env.adminEmails()) {
    await sendEmail({
      to: admin,
      subject: `💰 ${formatZar(payment.amountCents)} paid: ${what}`,
      text: `Customer: ${user?.email}\nKind: ${payment.kind}\nYoco checkout: ${checkout.id} (${checkout.processingMode ?? "?"})\nReport: ${env.appUrl()}/admin/scans/${payment.scanId}`,
    }).catch((e) => console.error("admin email failed", e));
  }
  return { ok: true as const, payment };
}

export async function settleByLookup(paymentId: string) {
  const db = await getDb();
  const payment = await db.query.payments.findFirst({ where: eq(t.payments.id, paymentId) });
  if (!payment?.yocoCheckoutId) return { ok: false as const, reason: "not_found", payment };
  const checkout = await getCheckout(payment.yocoCheckoutId);
  return { ...(await settlePayment(db, payment.id, checkout)), payment };
}
