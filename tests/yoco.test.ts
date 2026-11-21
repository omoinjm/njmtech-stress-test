import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyYocoWebhook } from "@/lib/yoco";

const secretBytes = Buffer.from("super-secret-signing-key-123456");
const SECRET = "whsec_" + secretBytes.toString("base64");
const body = JSON.stringify({ id: "evt_1", type: "payment.succeeded", payload: { metadata: { paymentId: "p1" } } });

function sign(id: string, ts: number, raw: string, key = secretBytes) {
  return "v1," + createHmac("sha256", key).update(`${id}.${ts}.${raw}`).digest("base64");
}

describe("verifyYocoWebhook", () => {
  const now = 1_800_000_000_000;
  const ts = now / 1000;

  it("accepts a correctly signed, fresh event", async () => {
    expect(await verifyYocoWebhook({ id: "msg_1", timestamp: String(ts), signature: sign("msg_1", ts, body) }, body, SECRET, now)).toBe(true);
  });
  it("accepts when one of several space-separated signatures matches (key rotation)", async () => {
    const sig = `v1,bogus ${sign("msg_1", ts, body)}`;
    expect(await verifyYocoWebhook({ id: "msg_1", timestamp: String(ts), signature: sig }, body, SECRET, now)).toBe(true);
  });
  it("rejects a tampered body", async () => {
    const sig = sign("msg_1", ts, body);
    expect(await verifyYocoWebhook({ id: "msg_1", timestamp: String(ts), signature: sig }, body.replace("p1", "p2"), SECRET, now)).toBe(false);
  });
  it("rejects the wrong secret", async () => {
    const sig = sign("msg_1", ts, body, Buffer.from("other"));
    expect(await verifyYocoWebhook({ id: "msg_1", timestamp: String(ts), signature: sig }, body, SECRET, now)).toBe(false);
  });
  it("rejects stale timestamps (>3 min, replay protection)", async () => {
    const old = ts - 181;
    expect(await verifyYocoWebhook({ id: "msg_1", timestamp: String(old), signature: sign("msg_1", old, body) }, body, SECRET, now)).toBe(false);
  });
  it("rejects missing headers", async () => {
    expect(await verifyYocoWebhook({ id: null, timestamp: String(ts), signature: sign("msg_1", ts, body) }, body, SECRET, now)).toBe(false);
  });
});
