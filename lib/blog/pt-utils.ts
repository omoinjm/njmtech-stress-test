import type { PortableTextBlock } from "@portabletext/react";

type Block = PortableTextBlock & { style?: string; children?: { text?: string }[] };

export const blockText = (b: Block) => (b.children ?? []).map((c) => c.text ?? "").join("");

export const headingId = (text: string) =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Table of contents from h2 blocks (ids match what the renderer emits). */
export function tableOfContents(body: PortableTextBlock[]): { id: string; text: string }[] {
  return (body as Block[]).filter((b) => b._type === "block" && b.style === "h2").map((b) => ({ id: headingId(blockText(b)), text: blockText(b) }));
}

export const isExternal = (href: string) => /^https?:\/\//.test(href) && !href.startsWith("https://security.njmtech.co.za");
