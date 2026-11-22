import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { BlogCta } from "@/components/blog-cta";
import { RichText } from "@/components/portable-text";
import { getUser } from "@/lib/auth";
import { getPost, readingMinutes, SITE_URL } from "@/lib/blog";
import { tableOfContents } from "@/lib/blog/pt-utils";
import { urlForImage } from "@/lib/sanity/image";
import { pageTitle } from "@/lib/seo";

type Props = PageProps<"/blog/[slug]">;

/** One Sanity fetch per request, shared by generateMetadata and the page. */
const load = cache(async (slug: string) => {
  const user = await getUser().catch(() => null);
  const includeDrafts = !!user?.isAdmin || process.env.NODE_ENV !== "production";
  return getPost(slug, { includeDrafts });
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await load(slug);
  if (!p) return { title: "Not found" };
  const url = `${SITE_URL}/blog/${p.slug}`;
  const image = shareImage(p);
  return {
    title: pageTitle(p.seoTitle || p.title),
    description: p.description,
    alternates: { canonical: url },
    robots: p.isDraft ? { index: false, follow: false } : undefined,
    openGraph: {
      type: "article",
      siteName: "NJM Tech Security", // page-level openGraph replaces the layout's, so repeat it
      locale: "en_ZA",
      url,
      title: p.title,
      description: p.description,
      publishedTime: p.publishedAt,
      modifiedTime: p.updatedAt ?? p.publishedAt,
      ...(image ? { images: [image] } : {}),
    },
    twitter: { card: "summary_large_image", title: p.title, description: p.description, ...(image ? { images: [image.url] } : {}) },
  };
}

/** 1200×630 share image from the post's main image (falls back to the site default card). */
function shareImage(p: { mainImage?: { alt?: string; asset?: { _ref: string } } | null; title: string }) {
  if (!p.mainImage?.asset) return null;
  return { url: urlForImage(p.mainImage).width(1200).height(630).fit("crop").auto("format").url(), width: 1200, height: 630, alt: p.mainImage.alt ?? p.title };
}

const fmt = (d: string) => new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const p = await load(slug);
  if (!p) notFound();
  const toc = tableOfContents(p.body);
  const url = `${SITE_URL}/blog/${p.slug}`;
  const authorId = `${SITE_URL}/#author-${p.author?.slug ?? "team"}`;
  const image = shareImage(p);

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
        author: { "@id": authorId },
        publisher: { "@id": `${SITE_URL}/#org` },
        keywords: (p.tags ?? []).join(", "),
        ...(image ? { image: { "@type": "ImageObject", url: image.url, width: 1200, height: 630 } } : {}),
        inLanguage: "en-ZA",
      },
      {
        "@type": "Person",
        "@id": authorId,
        name: p.author?.name ?? "NJM Tech Security",
        jobTitle: p.author?.role ?? undefined,
        description: p.author?.bio ?? undefined,
        sameAs: p.author?.sameAs?.length ? p.author.sameAs : undefined,
        worksFor: { "@id": `${SITE_URL}/#org` },
      },
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
      {p.isDraft && (
        <p className="mb-6 rounded-md border-2 border-amber-500 px-3 py-2 text-sm font-medium text-amber-700 dark:text-amber-400">
          📝 Draft preview: only admins can see this. Publish it in{" "}
          <a href="https://njmtech-security.sanity.studio/" className="underline" target="_blank" rel="noopener">Sanity Studio</a> to make it live.
        </p>
      )}
      <nav className="mb-4 text-sm text-slate-500">
        <Link href="/blog" className="hover:underline">Blog</Link>
        {p.category && <> / {p.category.title}</>}
      </nav>
      <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{p.title}</h1>
      <p className="mt-3 text-sm text-slate-500">
        {p.author && (
          <>By <strong className="text-slate-700 dark:text-slate-300">{p.author.name}</strong>{p.author.role ? `, ${p.author.role}` : ""} · </>
        )}
        {fmt(p.publishedAt)}
        {p.updatedAt && ` · Updated ${fmt(p.updatedAt)}`} · {readingMinutes(p.chars)} min read
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
        <RichText value={p.body} slug={p.slug} />
      </div>

      <BlogCta slug={p.slug} variant="end" />

      {p.author && (
        <footer className="mt-8 rounded-xl border border-black/10 p-5 text-sm dark:border-white/10">
          <p className="font-semibold">{p.author.name}</p>
          {p.author.role && <p className="text-slate-500">{p.author.role}</p>}
          {p.author.bio && <p className="mt-2 text-slate-600 dark:text-slate-300">{p.author.bio}</p>}
        </footer>
      )}

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </article>
  );
}
