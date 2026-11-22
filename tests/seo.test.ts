import { describe, expect, it } from "vitest";
import { MAX_TITLE, pageTitle } from "@/lib/seo";

describe("pageTitle", () => {
  it("adds the brand when it fits", () => {
    expect(pageTitle("Website Security Blog")).toBe("Website Security Blog | NJM Tech Security");
  });
  it("drops the brand rather than exceed 70 characters", () => {
    const t = "Will Your Online Store Survive Black Friday? 10-Minute Check";
    expect(pageTitle(t)).toBe(t);
    for (const s of [
      "How to Check If Your Website Is Secure: 8 Checks (SA Guide)",
      "Website Says “Not Secure”? 5 Causes and How to Fix Each",
      "Website Hacked? What to Do in the First 24 Hours (SA)",
    ]) expect(pageTitle(s).length).toBeLessThanOrEqual(MAX_TITLE);
  });
  it("never duplicates the brand", () => {
    expect(pageTitle("About NJM Tech Security")).toBe("About NJM Tech Security");
  });
});
