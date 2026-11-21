import type { Check, RawFinding } from "../types";

export function parseVersion(v: string): number[] {
  return v.split(".").map((n) => parseInt(n, 10) || 0);
}
export function versionLt(a: string, b: string): boolean {
  const pa = parseVersion(a), pb = parseVersion(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? 0, y = pb[i] ?? 0;
    if (x !== y) return x < y;
  }
  return false;
}

const JQUERY_RES = [
  /jquery[-.](\d+\.\d+(?:\.\d+)?)(?:\.min|\.slim)?\.js/i,
  /jquery(?:\.min)?\.js\?ver=(\d+\.\d+(?:\.\d+)?)/i,
  /ajax\.googleapis\.com\/ajax\/libs\/jquery\/(\d+\.\d+(?:\.\d+)?)/i,
  /code\.jquery\.com\/jquery-(\d+\.\d+(?:\.\d+)?)/i,
];

export const cmsCheck: Check = {
  key: "cms",
  label: "CMS & library fingerprint",
  async run({ origin, fetch, home }) {
    const out: RawFinding[] = [];
    const body = home.body;

    const gen = body.match(/<meta[^>]+name=["']generator["'][^>]+content=["']([^"']+)["']/i)?.[1];
    if (gen && /\d/.test(gen)) {
      out.push({ key: "cms.version-disclosed", evidence: `<meta name="generator" content="${gen}">` });
    }

    for (const re of JQUERY_RES) {
      const v = body.match(re)?.[1];
      if (v) {
        if (versionLt(v, "3.5.0")) {
          out.push({ key: "cms.outdated-jquery", evidence: `jQuery ${v} detected (fixes for CVE-2020-11022/11023 arrived in 3.5.0)` });
        }
        break;
      }
    }

    const isWordPress = /wp-content|wp-includes/i.test(body) || /wordpress/i.test(gen ?? "");
    if (isWordPress) {
      try {
        const res = await fetch(origin + "/wp-json/wp/v2/users", { maxBytes: 32_768 });
        if (res.status === 200) {
          const users = JSON.parse(res.body) as { slug?: string }[];
          if (Array.isArray(users) && users.length > 0) {
            const slugs = users.slice(0, 5).map((u) => u.slug).filter(Boolean);
            out.push({
              key: "cms.wp-user-enum",
              // Don't store the actual usernames in full: mask them.
              evidence: `/wp-json/wp/v2/users lists ${users.length} account(s), e.g. ${slugs.map((s) => s!.slice(0, 2) + "***").join(", ")}`,
            });
          }
        }
      } catch {}
      try {
        const res = await fetch(origin + "/xmlrpc.php", { follow: false, maxBytes: 2048 });
        if (/XML-RPC server accepts POST requests only/i.test(res.body)) {
          out.push({ key: "cms.wp-xmlrpc", evidence: `${origin}/xmlrpc.php is reachable` });
        }
      } catch {}
    }
    return out;
  },
};
