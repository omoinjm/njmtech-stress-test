import { describe, expect, it } from "vitest";
import { screenContact } from "@/lib/contact";

const now = 1_800_000_000_000;
const form = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
};
const good = { name: "Thandi", email: "thandi@shop.co.za", message: "Can you help with our checkout security?", startedAt: String(now - 10_000), fax: "" };

describe("contact form screening", () => {
  it("accepts a normal human submission", () => {
    const r = screenContact(form(good), now);
    expect(r).toMatchObject({ spam: false, data: { name: "Thandi", email: "thandi@shop.co.za" } });
  });
  it("silently drops bots: honeypot filled, instant submit, missing or future timestamp", () => {
    expect(screenContact(form({ ...good, fax: "123" }), now)).toEqual({ spam: true });
    expect(screenContact(form({ ...good, startedAt: String(now - 500) }), now)).toEqual({ spam: true });
    expect(screenContact(form({ ...good, startedAt: "" }), now)).toEqual({ spam: true });
    expect(screenContact(form({ ...good, startedAt: String(now + 60_000) }), now)).toEqual({ spam: true });
  });
  it("returns a friendly validation error for bad input", () => {
    expect(screenContact(form({ ...good, email: "nope" }), now)).toEqual({ spam: false, error: "Enter a valid email address." });
    expect(screenContact(form({ ...good, message: "hi" }), now)).toMatchObject({ spam: false, error: expect.stringContaining("at least 10") });
  });
});
