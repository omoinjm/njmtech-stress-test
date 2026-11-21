import type { Check } from "../types";

const RESOURCE_RE = /<(?:script|img|iframe|link|source|video|audio)\b[^>]*?\b(?:src|href)\s*=\s*["'](http:\/\/[^"']+)["']/gi;

export const mixedContentCheck: Check = {
  key: "mixed-content",
  label: "Mixed content",
  async run({ home }) {
    if (!home.url.startsWith("https:")) return [];
    const urls = new Set<string>();
    for (const m of home.body.matchAll(RESOURCE_RE)) {
      // <a href> isn't matched; <link href> to stylesheets/icons is.
      urls.add(m[1]);
      if (urls.size >= 10) break;
    }
    if (urls.size === 0) return [];
    return [{ key: "mixed.content", evidence: [...urls].join("\n") }];
  },
};
