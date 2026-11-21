import { PortableText, type PortableTextBlock, type PortableTextComponents } from "@portabletext/react";
import { urlForImage } from "@/lib/sanity/image";
import { blockText, headingId, isExternal } from "@/lib/blog/pt-utils";
import { BlogCta } from "./blog-cta";

const CALLOUT: Record<string, string> = {
  info: "border-sky-500 bg-sky-500/5",
  warning: "border-amber-500 bg-amber-500/5",
  tip: "border-emerald-600 bg-emerald-600/5",
};

function components(slug?: string): PortableTextComponents {
  return {
    block: {
      h2: ({ children, value }) => <h2 id={headingId(blockText(value))}>{children}</h2>,
      h3: ({ children }) => <h3>{children}</h3>,
      blockquote: ({ children }) => <blockquote>{children}</blockquote>,
    },
    marks: {
      link: ({ children, value }) => {
        const href: string = value?.href ?? "#";
        return isExternal(href) ? (
          <a href={href} target="_blank" rel="noopener">{children}</a>
        ) : (
          <a href={href}>{children}</a>
        );
      },
      code: ({ children }) => <code>{children}</code>,
    },
    types: {
      scanCta: ({ value }) => (slug ? <BlogCta slug={slug} heading={value?.heading} /> : null),
      codeBlock: ({ value }) => (
        <figure>
          {value?.filename && <figcaption className="text-xs text-slate-500">{value.filename}</figcaption>}
          <pre><code data-language={value?.language}>{value?.code}</code></pre>
        </figure>
      ),
      dataTable: ({ value }) => {
        const rows: { _key: string; cells: string[] }[] = value?.rows ?? [];
        if (rows.length === 0) return null;
        const [head, ...rest] = rows;
        return (
          <table>
            {value?.caption && <caption>{value.caption}</caption>}
            <thead><tr>{head.cells.map((c, i) => <th key={i}>{c}</th>)}</tr></thead>
            <tbody>{rest.map((r) => <tr key={r._key}>{r.cells.map((c, i) => <td key={i}>{c}</td>)}</tr>)}</tbody>
          </table>
        );
      },
      callout: ({ value }) => (
        <aside className={`not-prose rounded-lg border-l-4 px-4 py-3 text-sm ${CALLOUT[value?.tone ?? "info"] ?? CALLOUT.info}`}>{value?.text}</aside>
      ),
      image: ({ value }) =>
        value?.asset ? (
          <figure>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={urlForImage(value).width(1200).fit("max").auto("format").url()} alt={value.alt ?? ""} loading="lazy" className="rounded-lg" />
            {value.caption && <figcaption className="mt-1 text-xs text-slate-500">{value.caption}</figcaption>}
          </figure>
        ) : null,
    },
  };
}

/** Renders a Portable Text body. Pass `slug` on blog posts so scan CTAs are attributed. */
export function RichText({ value, slug }: { value: PortableTextBlock[]; slug?: string }) {
  return <PortableText value={value} components={components(slug)} />;
}
