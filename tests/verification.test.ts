import { describe, expect, it } from "vitest";
import { authorizationDomains, emailQualifiesFor, emailVerificationAllowed, registrableDomain } from "@/lib/domains";
import { CHECK_MODES, checkKeysFor } from "@/lib/scanner/check-keys";

describe("authorization domains", () => {
  it.each([
    ["shop.example.co.za", "example.co.za"],
    ["www.njmtech.co.za", "njmtech.co.za"],
    ["njmtech.co.za", "njmtech.co.za"],
    ["a.b.example.com", "example.com"],
    ["example.com.au", "example.com.au"],
    ["store.example.org.za", "example.org.za"],
    ["example.io", "example.io"],
  ])("%s → %s", (host, base) => expect(registrableDomain(host)).toBe(base));

  it("walks from the host up to the registrable domain, ignoring www", () => {
    expect(authorizationDomains("shop.eu.example.co.za")).toEqual(["shop.eu.example.co.za", "eu.example.co.za", "example.co.za"]);
    expect(authorizationDomains("www.example.com")).toEqual(["example.com"]);
  });
});

describe("email verification eligibility (a mailbox at the site's own domain)", () => {
  it("accepts any mailbox at the site's domain or its parents", () => {
    expect(emailQualifiesFor("info@example.co.za", "shop.example.co.za")).toBe(true);
    expect(emailQualifiesFor("Nhlanhla@Example.co.za", "example.co.za")).toBe(true);
    expect(emailQualifiesFor("admin@shop.example.co.za", "shop.example.co.za")).toBe(true);
  });
  it("rejects outside addresses, so a requester can't approve their own scan of someone else's site", () => {
    expect(emailQualifiesFor("me@gmail.com", "example.co.za")).toBe(false);
    expect(emailQualifiesFor("admin@evil.co.za", "example.co.za")).toBe(false);
    expect(emailQualifiesFor("admin@example.co.za.evil.com", "example.co.za")).toBe(false);
    expect(emailQualifiesFor("admin@co.za", "example.co.za")).toBe(false); // public suffix is not the site's domain
    expect(emailQualifiesFor("admin@other.example.co.za", "shop.example.co.za")).toBe(false); // sibling subdomain
    expect(emailQualifiesFor("not an email", "example.co.za")).toBe(false);
  });
  it("disables email approval for free-mail domains (anyone can get a mailbox there)", () => {
    expect(emailVerificationAllowed("mail.google.com")).toBe(true); // google.com isn't free-mail; gmail.com is
    expect(emailVerificationAllowed("gmail.com")).toBe(false);
    expect(emailQualifiesFor("someone@gmail.com", "gmail.com")).toBe(false);
    expect(emailVerificationAllowed("localhost")).toBe(false);
  });
});

describe("public vs deep checks", () => {
  it("public scans never run probing checks", () => {
    const pub = checkKeysFor("public");
    expect(pub).not.toContain("exposed-files");
    expect(pub).not.toContain("wordpress");
    expect(pub).not.toContain("cors");
    expect(pub.every((k) => CHECK_MODES[k] === "public")).toBe(true);
    expect(checkKeysFor("deep").length).toBeGreaterThan(pub.length);
  });
});
