import { describe, expect, it } from "vitest";
import { isPrivatePath, validClarityId } from "@/lib/analytics";

describe("Clarity private pages", () => {
  it.each(["/scans/abc", "/scans", "/admin", "/admin/scans/1", "/dashboard", "/domains/1", "/payments/return", "/verify-domain", "/verified", "/auth/callback", "/login", "/api/scans"])(
    "%s is never recorded",
    (p) => expect(isPrivatePath(p)).toBe(true),
  );
  it.each(["/", "/blog", "/blog/will-your-online-store-survive-black-friday", "/terms", "/scansafe-guide", "/administrative-tips"])(
    "%s is a public page",
    (p) => expect(isPrivatePath(p)).toBe(false),
  );
  it("accepts only plausible project IDs", () => {
    expect(validClarityId("abc12def34")).toBe(true);
    expect(validClarityId("")).toBe(false);
    expect(validClarityId(undefined)).toBe(false);
    expect(validClarityId("x\"><script>")).toBe(false);
  });
});
