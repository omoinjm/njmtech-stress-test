/** Search engines truncate long titles; Bing flags anything over 70 characters. */
export const MAX_TITLE = 70;
export const SITE_NAME = "NJM Tech Security";

/**
 * "<page title> | NJM Tech Security" when that fits in 70 characters; otherwise the page title
 * alone (the brand already appears in og:site_name and structured data).
 */
export function pageTitle(title: string): string {
  const t = title.trim();
  if (t.includes(SITE_NAME)) return t;
  const branded = `${t} | ${SITE_NAME}`;
  return branded.length <= MAX_TITLE ? branded : t;
}
