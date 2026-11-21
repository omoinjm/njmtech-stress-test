import { Marked } from "marked";

const marked = new Marked({ gfm: true, breaks: false });

export const CTA_MARKER = "{{SCAN_CTA}}";

const slugify = (s: string) =>
  s.toLowerCase().replace(/<[^>]+>/g, "").replace(/&[a-z]+;/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/**
 * Markdown → HTML chunks, split at the inline-CTA marker so the page can render the live scan
 * form between them. Content is authored by us (trusted); headings get ids for deep links.
 * External links open in a new tab with rel=noopener.
 */
export function renderPost(markdown: string): { chunks: string[]; toc: { id: string; text: string }[] } {
  const toc: { id: string; text: string }[] = [];
  const chunks = markdown.split(CTA_MARKER).map((part) => {
    let html = marked.parse(part, { async: false }) as string;
    html = html.replace(/<h2>(.*?)<\/h2>/g, (_m, inner: string) => {
      const id = slugify(inner);
      toc.push({ id, text: inner.replace(/<[^>]+>/g, "") });
      return `<h2 id="${id}">${inner}</h2>`;
    });
    html = html.replace(/<a href="(https?:\/\/(?!security\.njmtech\.co\.za)[^"]+)"/g, '<a href="$1" target="_blank" rel="noopener"');
    return html;
  });
  return { chunks, toc };
}

/** Rough reading time at ~220 words/minute. */
export const readingMinutes = (markdown: string) => Math.max(1, Math.round(markdown.split(/\s+/).length / 220));
