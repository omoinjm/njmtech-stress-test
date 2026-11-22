import type { Metadata } from "next";
import Link from "next/link";
import { PostImage } from "@/components/post-image";
import { Card } from "@/components/ui";
import { publishedPosts, readingMinutes, SITE_URL } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Website Security Blog | NJM Tech Security",
  description: "Plain-English website security for South African businesses: how to check your site, fix common problems, and keep your online store safe.",
  alternates: { canonical: `${SITE_URL}/blog`, types: { "application/rss+xml": `${SITE_URL}/blog/rss.xml` } },
};

const fmt = (d: string) => new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });

export default async function BlogIndex() {
  const posts = await publishedPosts();
  return (
    <div className="grid gap-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Website security, in plain English</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Practical guides for South African businesses with a website, online store or web app.
        </p>
      </header>
      {posts.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500">The first articles are on their way.</p>
          <Link href="/" className="mt-3 inline-block text-sm font-semibold text-emerald-600 underline">
            In the meantime, scan your website free →
          </Link>
        </Card>
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2">
          {posts.map((p, i) => (
            <li key={p.slug}>
              <Link
                href={`/blog/${p.slug}`}
                className="group flex h-full flex-col overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm transition hover:border-emerald-600/50 hover:shadow-md dark:border-white/10 dark:bg-white/5"
              >
                <PostImage image={p.mainImage} alt={p.title} sizes="(min-width: 1024px) 480px, (min-width: 640px) 50vw, 100vw" priority={i === 0} />
                <div className="flex flex-1 flex-col p-5">
                  <p className="text-xs text-slate-500">
                    {fmt(p.publishedAt)} · {readingMinutes(p.chars)} min read
                    {p.category ? ` · ${p.category.title}` : ""}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold leading-snug group-hover:underline">{p.title}</h2>
                  <p className="mt-2 flex-1 text-sm text-slate-600 dark:text-slate-300">{p.description}</p>
                  <span className="mt-3 text-sm font-semibold text-emerald-600">Read the guide →</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
