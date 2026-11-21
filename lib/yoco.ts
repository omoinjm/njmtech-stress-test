// Yoco Checkout API: https://developer.yoco.com/guides/online-payments/accepting-a-payment
const API = "https://payments.yoco.com/api";

export type YocoCheckout = {
  id: string;
  status: "created" | "started" | "processing" | "completed" | "expired";
  amount: number;
  currency: string;
  redirectUrl: string;
  paymentId: string | null;
  metadata: Record<string, unknown> | null;
  processingMode?: "live" | "test";
};

function key() {
  const k = process.env.YOCO_SECRET_KEY;
  if (!k) throw new Error("YOCO_SECRET_KEY is not configured");
  return k;
}

export async function createCheckout(input: {
  amountCents: number;
  successUrl: string;
  cancelUrl: string;
  failureUrl: string;
  metadata: Record<string, string>;
  externalId: string;
  idempotencyKey: string;
}): Promise<YocoCheckout> {
  const res = await fetch(`${API}/checkouts`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${key()}`,
      "content-type": "application/json",
      "idempotency-key": input.idempotencyKey,
    },
    body: JSON.stringify({
      amount: input.amountCents,
      currency: "ZAR",
      successUrl: input.successUrl,
      cancelUrl: input.cancelUrl,
      failureUrl: input.failureUrl,
      metadata: input.metadata,
      externalId: input.externalId,
    }),
  });
  if (!res.ok) throw new Error(`Yoco checkout failed: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as YocoCheckout;
}

export async function getCheckout(id: string): Promise<YocoCheckout> {
  const res = await fetch(`${API}/checkouts/${encodeURIComponent(id)}`, { headers: { authorization: `Bearer ${key()}` } });
  if (!res.ok) throw new Error(`Yoco get checkout failed: HTTP ${res.status}`);
  return (await res.json()) as YocoCheckout;
}

const b64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

function timingSafeEqualStr(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Verifies a Yoco webhook (Standard Webhooks scheme):
 * signed content = `${webhook-id}.${webhook-timestamp}.${rawBody}`, HMAC-SHA256 with the
 * base64-decoded secret (after the "whsec_" prefix), compared against each "v1,<sig>" entry.
 * Timestamps older/newer than 3 minutes are rejected (replay protection).
 */
export async function verifyYocoWebhook(
  headers: { id: string | null; timestamp: string | null; signature: string | null },
  rawBody: string,
  secret: string,
  nowMs = Date.now(),
): Promise<boolean> {
  const { id, timestamp, signature } = headers;
  if (!id || !timestamp || !signature || !secret) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(nowMs / 1000 - ts) > 180) return false;
  const keyBytes = fromB64(secret.startsWith("whsec_") ? secret.slice(6) : secret);
  const cryptoKey = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expected = b64(await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(`${id}.${timestamp}.${rawBody}`)));
  return signature
    .split(" ")
    .map((part) => part.split(",")[1] ?? "")
    .some((sig) => timingSafeEqualStr(sig, expected));
}
