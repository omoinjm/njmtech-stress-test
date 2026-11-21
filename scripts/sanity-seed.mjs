// Bootstrap a Sanity dataset: author, categories and the terms page.
// Usage: SANITY_API_WRITE_TOKEN=… pnpm sanity:seed   (token lives in Infisical: env-vault /njmtech-security)
// Safe to re-run: createIfNotExists never overwrites content edited in the Studio.
// (The first blog post was migrated from code on 2026-11-21 and now lives only in Sanity.)
import { createClient } from "@sanity/client";
import { marked } from "marked";

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID ?? "w1uoie7f",
  dataset: process.env.SANITY_DATASET ?? "production",
  apiVersion: "2026-11-21",
  token: process.env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
});

let n = 0;
const key = () => `k${(++n).toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/** marked inline tokens → Portable Text spans (+ link markDefs). */
function spans(tokens, marks = [], markDefs = []) {
  const out = [];
  for (const t of tokens ?? []) {
    if (t.type === "strong") out.push(...spans(t.tokens, [...marks, "strong"], markDefs));
    else if (t.type === "em") out.push(...spans(t.tokens, [...marks, "em"], markDefs));
    else if (t.type === "codespan") out.push({ _type: "span", _key: key(), text: decode(t.text), marks: [...marks, "code"] });
    else if (t.type === "link") {
      const k = key();
      markDefs.push({ _type: "link", _key: k, href: t.href });
      out.push(...spans(t.tokens, [...marks, k], markDefs));
    } else if (t.tokens) out.push(...spans(t.tokens, marks, markDefs));
    else out.push({ _type: "span", _key: key(), text: decode(t.text ?? t.raw ?? ""), marks });
  }
  return out;
}

const decode = (s) => s.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

function block(style, inlineTokens, extra = {}) {
  const markDefs = [];
  const children = spans(inlineTokens, [], markDefs);
  return { _type: "block", _key: key(), style, markDefs, children, ...extra };
}

/** Markdown (our subset) → Portable Text array. A paragraph of {{SCAN_CTA}} becomes a scanCta block. */
export function markdownToPortableText(md) {
  const out = [];
  for (const t of marked.lexer(md)) {
    if (t.type === "space" || t.type === "hr") continue;
    if (t.type === "paragraph" && t.text.trim() === "{{SCAN_CTA}}") out.push({ _type: "scanCta", _key: key() });
    else if (t.type === "heading") out.push(block(t.depth <= 2 ? "h2" : "h3", t.tokens));
    else if (t.type === "paragraph") out.push(block("normal", t.tokens));
    else if (t.type === "blockquote") out.push(block("blockquote", t.tokens.flatMap((x) => x.tokens ?? [])));
    else if (t.type === "list") {
      for (const item of t.items) {
        const inline = item.tokens.flatMap((x) => (x.type === "text" || x.type === "paragraph" ? x.tokens ?? [{ type: "text", text: x.text }] : []));
        out.push(block("normal", inline, { listItem: t.ordered ? "number" : "bullet", level: 1 }));
      }
    } else if (t.type === "code") out.push({ _type: "codeBlock", _key: key(), language: t.lang || "text", code: t.text });
    else if (t.type === "table") {
      const row = (cells) => ({ _type: "tableRow", _key: key(), cells: cells.map((c) => spans(c.tokens).map((s) => s.text).join("")) });
      out.push({ _type: "dataTable", _key: key(), rows: [row(t.header), ...t.rows.map(row)] });
    } else throw new Error(`Unhandled markdown token: ${t.type}`);
  }
  return out;
}

const TERMS_MD = `
1. The free public scan only reads what any visitor's browser receives: the homepage, its TLS certificate and public DNS records. It sends no probes, logins or load.
2. The deep scan and stress test may only be run on websites you own or are explicitly authorised to test. They require approval from the domain (a one-click link sent to a mailbox at the website's own domain, or a DNS/file record), valid for 30 days.
3. The optional stress test sends at most 50 concurrent requests for at most 30 seconds, stops automatically if your site starts failing, and runs at most once per site per day.
4. Every scan is logged with the requesting account and IP address.
5. Automated results may include false positives or miss issues; they are not a substitute for a full manual penetration test.
6. Your scan results are confidential and are only used to provide the report and, if you request it, a quote to fix the issues.
`;

const CATEGORIES = [
  ["website-security-check", "Is my website secure?", "How to check your website's security, in plain English."],
  ["fix-guides", "Fix guides", "Step-by-step fixes for common website security problems."],
  ["hacked-website", "Hacked website", "What to do when your website has been hacked."],
  ["popia", "POPIA & compliance", "What South African law expects from your website."],
  ["ecommerce", "Online stores", "Security and performance for online stores."],
];

if (!process.env.SANITY_API_WRITE_TOKEN) throw new Error("Set SANITY_API_WRITE_TOKEN");

const tx = client.transaction();
tx.createIfNotExists({
  _id: "author-founder",
  _type: "author",
  name: "Nhlanhla Malaza",
  slug: { _type: "slug", current: "nhlanhla-malaza" },
  role: "Founder, NJM Tech",
  bio: "Builds and secures websites and web apps for South African businesses, and built NJM Tech Security to make website security checks free and understandable.",
});
for (const [slug, title, description] of CATEGORIES) {
  tx.createIfNotExists({ _id: `category-${slug}`, _type: "category", title, slug: { _type: "slug", current: slug }, description });
}
tx.createIfNotExists({
  _id: "legal-terms",
  _type: "legalPage",
  title: "Scanning terms",
  slug: { _type: "slug", current: "terms" },
  updatedAt: new Date().toISOString(),
  body: markdownToPortableText(TERMS_MD),
});
const res = await tx.commit();
console.log(`seeded ${res.results.length} documents:`, res.results.map((r) => r.id).join(", "));
