import { describe, expect, it } from "vitest";
import { authorizationDomains, emailQualifiesFor, registrableDomain, verificationEmailOptions } from "@/lib/domains";
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

describe("email verification eligibility (CA/B Forum constructed addresses only)", () => {
  it("offers the five admin mailboxes at the registrable domain", () => {
    expect(verificationEmailOptions("shop.example.co.za")).toEqual([
      "admin@example.co.za", "administrator@example.co.za", "webmaster@example.co.za", "hostmaster@example.co.za", "postmaster@example.co.za",
    ]);
    expect(verificationEmailOptions("localhost")).toEqual([]);
  });
  it("qualifies only reserved local parts at an authorization domain", () => {
    expect(emailQualifiesFor("admin@example.co.za", "shop.example.co.za")).toBe(true);
    expect(emailQualifiesFor("Webmaster@Shop.Example.co.za", "shop.example.co.za")).toBe(true);
    expect(emailQualifiesFor("info@example.co.za", "shop.example.co.za")).toBe(false); // not a reserved mailbox
    expect(emailQualifiesFor("john@example.co.za", "example.co.za")).toBe(false);
    expect(emailQualifiesFor("admin@evil.co.za", "example.co.za")).toBe(false);
    expect(emailQualifiesFor("admin@co.za", "example.co.za")).toBe(false); // public suffix is not an authorization domain
    expect(emailQualifiesFor("admin@other.example.co.za", "shop.example.co.za")).toBe(false); // sibling subdomain
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
