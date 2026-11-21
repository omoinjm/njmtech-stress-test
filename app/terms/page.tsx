import type { Metadata } from "next";
import { RichText } from "@/components/portable-text";
import { Card } from "@/components/ui";
import type { PortableTextBlock } from "@portabletext/react";
import { LEGAL_PAGE_QUERY } from "@/lib/blog/queries";
import { sanityFetch } from "@/lib/sanity/client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Scanning Terms | NJM Tech Security",
  description: "What NJM Tech Security's free public scan, deep scan and stress test do, what they never do, and how owner approval works.",
  alternates: { canonical: "/terms" },
};

/** Edited in Sanity Studio (legalPage "terms"); the built-in copy is only a fallback if Sanity is unreachable. */
export default async function Terms() {
  const page = await sanityFetch<{ title: string; updatedAt?: string; body: PortableTextBlock[] } | null>(LEGAL_PAGE_QUERY, { slug: "terms" }).catch(() => null);
  return (
    <Card className="prose-blog">
      <h1 className="text-xl font-semibold">{page?.title ?? "Scanning terms"}</h1>
      {page?.updatedAt && (
        <p className="text-xs text-slate-500">Last updated {new Date(page.updatedAt).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })}</p>
      )}
      {page?.body ? (
        <RichText value={page.body} />
      ) : (
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">
          <li>The free public scan only reads what any visitor&apos;s browser receives. The deep scan and stress test require approval from the domain.</li>
          <li>Checks are non-destructive. Every scan is logged with the requesting account and IP address.</li>
          <li>Automated results may include false positives or miss issues; they are not a substitute for a manual penetration test.</li>
        </ol>
      )}
    </Card>
  );
}
