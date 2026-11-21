import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Fragment } from "react";
import { BlogCta } from "@/components/blog-cta";
import { getUser } from "@/lib/auth";
import { authorOf, getPost, SITE_URL } from "@/lib/blog";
import { readingMinutes, renderPost } from "@/lib/blog/render";

type Props = PageProps<"/blog/[slug]">;

async function load(slug: string) {
  const user = await getUser().catch(() => null);
  const includeDrafts = !!user?.isAdmin || process.env.NODE_ENV !== "production";
  return getPost(slug, { includeDrafts });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await load(slug);
  if (!p) return { title: "Not found" };
  const url = `${SITE_URL}/blog/${p.slug}`;
  return {
    title: `${p.title} | NJM Tech Security`,
    description: p.description,
    alternates: { canonical: url },
    robots: p.draft ? { index: false, follow: false } : undefined,
    openGraph: { type: "article", url, title: p.title, description: p.description, publishedTime: p.publishedAt, modifiedTime: p.updatedAt ?? p.publishedAt },
  };
}

const fmt = (d: string) => new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const p = await load(slug);
  if (!p) notFound();
  const author = authorOf(p);
  const { chunks, toc } = renderPost(p.body);
  const url = `${SITE_URL}/blog/${p.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        "@id": `${url}#article`,
        headline: p.title,
        description: p.description,
        datePublished: p.publishedAt,
        dateModified: p.updatedAt ?? p.publishedAt,
        mainEntityOfPage: url,
        author: { "@id": `${SITE_URL}/#author-${author.id}` },
        publisher: { "@id": `${SITE_URL}/#org` },
        keywords: p.tags.join(", "),
        inLanguage: "en-ZA",
      },
      { "@type": "Person", "@id": `${SITE_URL}/#author-${author.id}`, name: author.name, jobTitle: author.role, description: author.bio, worksFor: { "@id": `${SITE_URL}/#org` } },
      { "@type": "Organization", "@id": `${SITE_URL}/#org`, name: "NJM Tech", url: "https://njmtech.co.za", brand: { "@type": "Brand", name: "NJM Tech Security" } },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
          { "@type": "ListItem", position: 3, name: p.title, item: url },
        ],
      },
    ],
  };

  return (
    <article className="mx-auto max-w-3xl">
      {p.draft && (
        <p className="mb-6 rounded-md border-2 border-amber-500 px-3 py-2 text-sm font-medium text-amber-700 dark:text-amber-400">
          📝 Draft: only you (admin) can see this page. Set <code>draft: false</code> in the post file and merge to publish.
        </p>
      )}
      <nav className="mb-4 text-sm text-slate-500">
        <Link href="/blog" className="hover:underline">Blog</Link> /
      </nav>
      <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{p.title}</h1>
      <p className="mt-3 text-sm text-slate-500">
        By <strong className="text-slate-700 dark:text-slate-300">{author.name}</strong>, {author.role} · {fmt(p.publishedAt)}
        {p.updatedAt && ` · Updated ${fmt(p.updatedAt)}`} · {readingMinutes(p.body)} min read
      </p>

      {toc.length > 2 && (
        <details className="mt-6 rounded-lg border border-black/10 px-4 py-3 text-sm dark:border-white/10" open>
          <summary className="cursor-pointer font-semibold">In this article</summary>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            {toc.map((h) => (
              <li key={h.id}><a href={`#${h.id}`} className="hover:underline">{h.text}</a></li>
            ))}
          </ol>
        </details>
      )}

      <div className="prose-blog mt-8">
        {chunks.map((html, i) => (
          <Fragment key={i}>
            <div dangerouslySetInnerHTML={{ __html: html }} />
            {i < chunks.length - 1 && <BlogCta slug={p.slug} />}
          </Fragment>
        ))}
      </div>

      <BlogCta slug={p.slug} variant="end" />

      <footer className="mt-8 rounded-xl border border-black/10 p-5 text-sm dark:border-white/10">
        <p className="font-semibold">{author.name}</p>
        <p className="text-slate-500">{author.role}</p>
        <p className="mt-2 text-slate-600 dark:text-slate-300">{author.bio}</p>
      </footer>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </article>
  );
}
