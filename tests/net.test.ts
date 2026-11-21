import { describe, expect, it } from "vitest";
import { assertPublicHost, BlockedTargetError, isPrivateIp } from "@/lib/scanner/net";
import { normalizeOrigin, InputError } from "@/lib/domains";

describe("SSRF guard", () => {
  it.each(["127.0.0.1", "10.1.2.3", "172.16.5.5", "192.168.1.1", "169.254.169.254", "::1", "fd00::1", "::ffff:127.0.0.1", "100.64.0.1"])(
    "%s is private", (ip) => expect(isPrivateIp(ip)).toBe(true),
  );
  it.each(["8.8.8.8", "1.1.1.1", "2606:4700:4700::1111"])("%s is public", (ip) => expect(isPrivateIp(ip)).toBe(false));
  it("blocks the cloud metadata IP and localhost", async () => {
    await expect(assertPublicHost("169.254.169.254", false)).rejects.toBeInstanceOf(BlockedTargetError);
    await expect(assertPublicHost("localhost", false)).rejects.toBeInstanceOf(BlockedTargetError);
  });
});

describe("normalizeOrigin", () => {
  it("adds https and strips path", () => {
    expect(normalizeOrigin("Shop.Example.com/products?x=1", false)).toEqual({
      origin: "https://shop.example.com", hostname: "shop.example.com",
    });
  });
  it("rejects IPs, localhost and non-http schemes in production mode", () => {
    for (const bad of ["127.0.0.1", "localhost", "ftp://example.com", "http://user:pw@example.com"]) {
      expect(() => normalizeOrigin(bad, false)).toThrow(InputError);
    }
  });
});
