// GROQ queries for the blog. Always project only what the page needs.
const POST_CARD = `
  "slug": slug.current,
  title,
  description,
  publishedAt,
  updatedAt,
  "isDraft": _originalId in path("drafts.**"),
  "author": author->{name, role},
  "category": category->{title, "slug": slug.current},
  "chars": length(pt::text(body))
`;

export const POSTS_QUERY = `*[_type == "post" && defined(slug.current) && publishedAt <= now()]
  | order(publishedAt desc)[0...100]{${POST_CARD}}`;

/** Admin list (drafts perspective): include future-dated and draft posts. */
export const ADMIN_POSTS_QUERY = `*[_type == "post" && defined(slug.current)] | order(publishedAt desc)[0...200]{${POST_CARD}}`;

export const POST_QUERY = `*[_type == "post" && slug.current == $slug][0]{
  ${POST_CARD},
  seoTitle,
  tags,
  fixesFindings,
  "author": author->{name, role, bio, sameAs, "slug": slug.current},
  mainImage{alt, asset},
  body[]{
    ...,
    _type == "image" => {..., asset}
  }
}`;

export const FIX_GUIDES_QUERY = `*[_type == "post" && count(fixesFindings) > 0 && publishedAt <= now()]
  | order(publishedAt desc){"slug": slug.current, title, fixesFindings}`;

export const SITEMAP_QUERY = `*[_type == "post" && defined(slug.current) && publishedAt <= now()]{"slug": slug.current, publishedAt, updatedAt}`;

export const LEGAL_PAGE_QUERY = `*[_type == "legalPage" && slug.current == $slug][0]{title, updatedAt, body}`;
