import { describe, expect, it } from "vitest";
import { buildFixGuideMap, getPost, readingMinutes } from "@/lib/blog";
import { headingId, isExternal, tableOfContents } from "@/lib/blog/pt-utils";

describe("fix-guide map", () => {
  it("maps each finding key to the newest post that covers it (rows arrive newest first)", () => {
    const m = buildFixGuideMap([
      { slug: "new-hsts-guide", title: "New", fixesFindings: ["headers.hsts-missing"] },
      { slug: "old-headers-guide", title: "Old", fixesFindings: ["headers.hsts-missing", "headers.clickjacking"] },
      { slug: "no-keys", title: "None", fixesFindings: null },
    ]);
    expect(m["headers.hsts-missing"].slug).toBe("new-hsts-guide");
    expect(m["headers.clickjacking"].slug).toBe("old-headers-guide");
    expect(Object.keys(m)).toHaveLength(2);
  });
});

describe("Portable Text helpers", () => {
  const body = [
    { _type: "block", _key: "a", style: "h2", children: [{ _type: "span", text: "Why stores crash: the " }, { _type: "span", text: "basics" }] },
    { _type: "block", _key: "b", style: "normal", children: [{ _type: "span", text: "text" }] },
    { _type: "scanCta", _key: "c" },
    { _type: "block", _key: "d", style: "h2", children: [{ _type: "span", text: "What to fix first (in order)" }] },
  ];
  it("builds a TOC from h2 blocks with stable ids", () => {
    expect(tableOfContents(body as never)).toEqual([
      { id: "why-stores-crash-the-basics", text: "Why stores crash: the basics" },
      { id: "what-to-fix-first-in-order", text: "What to fix first (in order)" },
    ]);
    expect(headingId("Don't forget security!")).toBe("don-t-forget-security");
  });
  it("treats only other sites as external", () => {
    expect(isExternal("https://example.com/x")).toBe(true);
    expect(isExternal("https://security.njmtech.co.za/blog")).toBe(false);
    expect(isExternal("/blog/x")).toBe(false);
  });
  it("estimates reading time", () => {
    expect(readingMinutes(null)).toBe(1);
    expect(readingMinutes(5.5 * 220 * 5)).toBe(5);
  });
});

describe("getPost", () => {
  it("rejects malformed slugs without querying Sanity", async () => {
    expect(await getPost("../etc/passwd", { includeDrafts: true })).toBeNull();
    expect(await getPost("Bad Slug", { includeDrafts: false })).toBeNull();
  });
});
