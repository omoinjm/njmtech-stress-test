import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { getDb, t } from "@/lib/db";
import { settlePayment } from "@/lib/payments";
import { getCheckout, verifyYocoWebhook } from "@/lib/yoco";

type YocoEvent = { id: string; type: string; payload?: { metadata?: Record<string, unknown> } };

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const ok = await verifyYocoWebhook(
    {
      id: req.headers.get("webhook-id"),
      timestamp: req.headers.get("webhook-timestamp"),
      signature: req.headers.get("webhook-signature"),
    },
    raw,
    process.env.YOCO_WEBHOOK_SECRET ?? "",
  );
  if (!ok) return NextResponse.json({ error: "invalid signature" }, { status: 403 });

  const event = JSON.parse(raw) as YocoEvent;
  if (event.type !== "payment.succeeded") return NextResponse.json({ ignored: event.type });

  const md = event.payload?.metadata ?? {};
  const db = await getDb();
  const payment =
    (typeof md.paymentId === "string" && (await db.query.payments.findFirst({ where: eq(t.payments.id, md.paymentId) }))) ||
    (typeof md.checkoutId === "string" &&
      (await db.query.payments.findFirst({ where: eq(t.payments.yocoCheckoutId, md.checkoutId) }))) ||
    null;
  if (!payment?.yocoCheckoutId) return NextResponse.json({ ignored: "unknown payment" });

  // Re-read the checkout from Yoco so amount/status come from the source of truth, not the event body.
  const result = await settlePayment(db, payment.id, await getCheckout(payment.yocoCheckoutId));
  return NextResponse.json({ ok: result.ok });
}
