import { StartScanForm } from "./forms";

/** Scan call-to-action used inside and at the end of blog posts; attributes scans to the post. */
export function BlogCta({ slug, variant = "inline" }: { slug: string; variant?: "inline" | "end" }) {
  return (
    <aside className="not-prose my-8 rounded-xl border-2 border-emerald-600 bg-emerald-600/5 p-5">
      <p className="text-base font-bold">
        {variant === "end" ? "Check your website now. It's free and takes under a minute." : "Check your own site while you read"}
      </p>
      <p className="mb-4 mt-1 text-sm text-slate-600 dark:text-slate-300">
        No sign-up. We only read what any visitor&apos;s browser sees, and you get a score, every issue ranked, and one full fix free.
      </p>
      <StartScanForm source={`blog-${slug}`} compact />
    </aside>
  );
}
