import { describe, expect, it } from "vitest";
import { CATALOG } from "@/lib/findings/catalog";
import { cmsCheck, versionLt, wordpressCheck } from "@/lib/scanner/checks/cms-fingerprint";
import { cookiesCheck } from "@/lib/scanner/checks/cookies";
import { corsCheck } from "@/lib/scanner/checks/cors";
import { makeEmailDnsCheck } from "@/lib/scanner/checks/email-dns";
import { exposedFilesCheck } from "@/lib/scanner/checks/exposed-files";
import { headersCheck } from "@/lib/scanner/checks/headers";
import { infoLeakCheck } from "@/lib/scanner/checks/info-leak";
import { mixedContentCheck } from "@/lib/scanner/checks/mixed-content";
import { CHECKS, CHECK_KEYS, toFindings } from "@/lib/scanner";
import { ctx } from "./helpers";

const keys = (fs: { key: string }[]) => fs.map((f) => f.key).sort();

const SECURE_HEADERS = {
  "strict-transport-security": "max-age=31536000",
  "content-security-policy": "default-src 'self'; frame-ancestors 'self'",
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=()",
};

describe("headers", () => {
  it("flags all missing headers on a bare response", async () => {
    expect(keys(await headersCheck.run(ctx({})))).toEqual([
      "headers.clickjacking", "headers.csp-missing", "headers.hsts-missing",
      "headers.nosniff-missing", "headers.permissions-policy-missing", "headers.referrer-policy-missing",
    ]);
  });
  it("is clean with a hardened header set (CSP frame-ancestors satisfies clickjacking)", async () => {
    expect(await headersCheck.run(ctx({ headers: SECURE_HEADERS }))).toEqual([]);
  });
  it("does not require HSTS on plain http", async () => {
    const r = await headersCheck.run(ctx({ url: "http://shop.example.com/" }));
    expect(keys(r)).not.toContain("headers.hsts-missing");
  });
});

describe("cookies", () => {
  it("flags missing flags and names the cookie", async () => {
    const r = await cookiesCheck.run(ctx({ setCookies: ["PHPSESSID=abc; path=/", "ok=1; Secure; HttpOnly; SameSite=Lax"] }));
    expect(r).toHaveLength(1);
    expect(r[0].evidence).toContain("PHPSESSID: missing Secure, HttpOnly, SameSite");
    expect(r[0].evidence).not.toContain("ok:");
  });
});

describe("exposed files", () => {
  it("detects a real .env and .git, ignores soft-404 HTML", async () => {
    const r = await exposedFilesCheck.run(
      ctx({}, {
        "/.env": { body: "APP_KEY=base64:xyz\nDB_PASSWORD=hunter2\n" },
        "/.git/HEAD": { body: "ref: refs/heads/main\n" },
        "/backup.sql": { body: "<html><body>Page not found</body></html>" }, // soft 404
        "/phpinfo.php": { body: "<html>welcome</html>" },
      }),
    );
    expect(keys(r)).toEqual(["exposed.env", "exposed.git"]);
  });
  it("detects directory listing on the homepage", async () => {
    const r = await exposedFilesCheck.run(ctx({ body: "<title>Index of /</title>" }));
    expect(keys(r)).toContain("exposed.directory-listing");
  });
});

describe("cms fingerprint", () => {
  it("compares versions", () => {
    expect(versionLt("1.12.4", "3.5.0")).toBe(true);
    expect(versionLt("3.5.0", "3.5.0")).toBe(false);
    expect(versionLt("3.7.1", "3.5.0")).toBe(false);
  });
  it("public cms check only reads the homepage: generator + old jQuery, no requests", async () => {
    const body = `<meta name="generator" content="WordPress 6.1.1"><script src="/wp-includes/js/jquery/jquery.min.js?ver=1.12.4"></script>`;
    const c = ctx({ body });
    c.fetch = async () => { throw new Error("public check must not make requests"); };
    expect(keys(await cmsCheck.run(c))).toEqual(["cms.outdated-jquery", "cms.version-disclosed"]);
  });
  it("deep wordpress check flags user enumeration + xmlrpc; masks usernames; skips non-WP sites", async () => {
    const body = `<script src="/wp-includes/js/jquery/jquery.min.js?ver=1.12.4"></script>`;
    const routes = {
      "/wp-json/wp/v2/users": { body: JSON.stringify([{ slug: "admin" }, { slug: "editor" }]) },
      "/xmlrpc.php": { status: 405, body: "XML-RPC server accepts POST requests only." },
    };
    expect(await wordpressCheck.run(ctx({ body: "<html>shopify</html>" }, routes))).toEqual([]);
    const r = await wordpressCheck.run(ctx({ body }, routes));
    expect(keys(r)).toEqual(["cms.wp-user-enum", "cms.wp-xmlrpc"]);
    const enumF = r.find((f) => f.key === "cms.wp-user-enum")!;
    expect(enumF.evidence).toContain("ad***");
    expect(enumF.evidence).not.toContain("admin");
  });
});

describe("cors", () => {
  it("flags reflected origin with credentials as high", async () => {
    const c = ctx({});
    c.fetch = async (url, o) => ({
      url, status: 200, setCookies: [], body: "",
      headers: { "access-control-allow-origin": o?.headers?.origin ?? "", "access-control-allow-credentials": "true" },
    });
    expect(keys(await corsCheck.run(c))).toEqual(["cors.reflected-credentials"]);
  });
  it("is clean without CORS headers", async () => {
    expect(await corsCheck.run(ctx({}, { "/": {} }))).toEqual([]);
  });
});

describe("email dns", () => {
  it("flags missing SPF and DMARC", async () => {
    const check = makeEmailDnsCheck(async () => []);
    expect(keys(await check.run(ctx({})))).toEqual(["email.dmarc-missing", "email.spf-missing"]);
  });
  it("flags p=none and strips www", async () => {
    const seen: string[] = [];
    const check = makeEmailDnsCheck(async (n) => {
      seen.push(n);
      return n.startsWith("_dmarc") ? ["v=DMARC1; p=none"] : ["v=spf1 -all"];
    });
    const c = ctx({});
    c.hostname = "www.example.com";
    expect(keys(await check.run(c))).toEqual(["email.dmarc-none"]);
    expect(seen).toEqual(["example.com", "_dmarc.example.com"]);
  });
});

describe("mixed content & info leak", () => {
  it("finds http:// resources on https pages but not plain links", async () => {
    const body = `<script src="http://cdn.x.com/a.js"></script><a href="http://other.com">x</a><img src="https://ok/i.png">`;
    const r = await mixedContentCheck.run(ctx({ body }));
    expect(r[0].evidence).toBe("http://cdn.x.com/a.js");
  });
  it("flags versioned Server and X-Powered-By, not bare 'nginx'", async () => {
    expect(keys(await infoLeakCheck.run(ctx({ headers: { server: "Apache/2.4.29 (Ubuntu)", "x-powered-by": "PHP/7.2" } }))))
      .toEqual(["leak.powered-by", "leak.server-version"]);
    expect(await infoLeakCheck.run(ctx({ headers: { server: "nginx" } }))).toEqual([]);
  });
});

describe("registry & catalog", () => {
  it("CHECK_KEYS matches the registry", () => {
    expect(CHECKS.map((c) => c.key)).toEqual([...CHECK_KEYS]);
  });
  it("every finding key used in checks exists in the catalog", async () => {
    // toFindings throws on unknown keys; run all fixture findings through it.
    const all = [
      ...(await headersCheck.run(ctx({}))),
      ...(await cookiesCheck.run(ctx({ setCookies: ["a=1"] }))),
    ];
    expect(() => toFindings(all)).not.toThrow();
    for (const e of Object.values(CATALOG)) {
      expect(e.title.length).toBeGreaterThan(5);
      expect(e.fix.length).toBeGreaterThan(10);
    }
  });
  it("dedupes and sorts most severe first", () => {
    const f = toFindings([
      { key: "headers.nosniff-missing", evidence: "a" },
      { key: "exposed.env", evidence: "b" },
      { key: "exposed.env", evidence: "c" },
    ]);
    expect(f.map((x) => x.key)).toEqual(["exposed.env", "headers.nosniff-missing"]);
    expect(f[0].evidence).toBe("b\nc");
  });
});

describe("broken HTTPS reporting", () => {
  it("reports an untrusted certificate instead of 'no HTTPS' when HTTPS exists but fails", () => {
    const f = toFindings([
      { key: "tls.no-https", evidence: "served over http" },
      { key: "tls.cert-invalid", evidence: "HTTPS connection failed" },
    ]);
    expect(f.map((x) => x.key)).toEqual(["tls.cert-invalid"]);
  });
});
