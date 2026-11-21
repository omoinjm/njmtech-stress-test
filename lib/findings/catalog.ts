import type { Severity } from "../scanner/types";

export type CatalogEntry = {
  severity: Severity;
  title: string;
  /** Plain-language business impact (shown to the owner). */
  impact: string;
  /** Concrete remediation steps (markdown-ish plain text). */
  fix: string;
  /** Cheap for an owner to fix themselves: a good candidate for the free "unlocked" finding. */
  diyFriendly: boolean;
};

export const CATALOG: Record<string, CatalogEntry> = {
  // ---------- Transport / TLS ----------
  "tls.no-https": {
    severity: "critical",
    title: "Site is not served over HTTPS",
    impact:
      "Everything visitors send (logins, card details, contact forms) travels unencrypted and can be read or altered on public Wi-Fi. Browsers mark the site as \"Not secure\", which costs you sales.",
    fix:
      "1. Get a free certificate (Let's Encrypt / your host's \"Free SSL\" button / Cloudflare).\n2. Enable it for both example.com and www.example.com.\n3. Redirect all http:// traffic to https:// (see the HTTP→HTTPS redirect fix).",
    diyFriendly: false,
  },
  "tls.http-not-redirected": {
    severity: "high",
    title: "HTTP traffic is not redirected to HTTPS",
    impact:
      "Visitors who type your address without https:// land on an unencrypted page, where their session or form data can be intercepted.",
    fix:
      "Add a permanent (301) redirect from http:// to https://.\n\nNginx:\n  server { listen 80; server_name example.com; return 301 https://$host$request_uri; }\n\nApache (.htaccess):\n  RewriteEngine On\n  RewriteCond %{HTTPS} off\n  RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]\n\nWordPress/cPanel/Shopify/Wix: turn on \"Force HTTPS\" in the hosting or SSL settings.",
    diyFriendly: true,
  },
  "tls.cert-expired": {
    severity: "critical",
    title: "TLS certificate has expired",
    impact: "Browsers show a full-page security warning and most visitors leave immediately. Payments and API integrations break.",
    fix: "Renew the certificate now and turn on auto-renewal (certbot renew timer, or your host's auto-SSL).",
    diyFriendly: false,
  },
  "tls.cert-expiring": {
    severity: "high",
    title: "TLS certificate expires soon",
    impact: "When it expires, browsers will block visitors with a security warning and checkout will stop working.",
    fix: "Renew the certificate and enable automatic renewal (e.g. `certbot renew` on a cron/systemd timer, or the auto-SSL option in your hosting panel). Add a calendar reminder 30 days before expiry as a backstop.",
    diyFriendly: true,
  },
  "tls.cert-invalid": {
    severity: "high",
    title: "TLS certificate is not trusted",
    impact: "Visitors see a browser warning (wrong hostname, self-signed, or incomplete chain). Many will assume the site is hacked.",
    fix: "Install a certificate issued for this exact hostname by a public CA, including the full intermediate chain (use fullchain.pem, not cert.pem).",
    diyFriendly: false,
  },
  "tls.legacy-protocols": {
    severity: "medium",
    title: "Outdated TLS versions (1.0/1.1) are enabled",
    impact: "Old protocols have known weaknesses and fail PCI-DSS compliance required for card payments.",
    fix: "Allow only TLS 1.2 and 1.3.\n\nNginx: ssl_protocols TLSv1.2 TLSv1.3;\nApache: SSLProtocol -all +TLSv1.2 +TLSv1.3\nCloudflare: SSL/TLS → Edge Certificates → Minimum TLS Version = 1.2",
    diyFriendly: false,
  },

  // ---------- Security headers ----------
  "headers.hsts-missing": {
    severity: "medium",
    title: "Missing HSTS header (Strict-Transport-Security)",
    impact: "Browsers can be tricked into loading your site over plain HTTP on hostile networks, exposing logins and sessions.",
    fix: "Send this header on every HTTPS response:\n  Strict-Transport-Security: max-age=31536000; includeSubDomains\n\nNginx: add_header Strict-Transport-Security \"max-age=31536000; includeSubDomains\" always;\nApache: Header always set Strict-Transport-Security \"max-age=31536000; includeSubDomains\"\nCloudflare: SSL/TLS → Edge Certificates → HSTS.",
    diyFriendly: true,
  },
  "headers.csp-missing": {
    severity: "medium",
    title: "No Content-Security-Policy",
    impact: "If an attacker injects a script (via a plugin bug, comment field, or compromised third-party tag), nothing stops it from stealing customer data or card details (\"Magecart\" style skimming).",
    fix: "Start in report-only mode so nothing breaks, then enforce:\n  Content-Security-Policy-Report-Only: default-src 'self'; script-src 'self' https://trusted-cdn.example; object-src 'none'; frame-ancestors 'self'; base-uri 'self'\n\nReview reports for a week, add the domains you really use, then rename the header to Content-Security-Policy.",
    diyFriendly: false,
  },
  "headers.clickjacking": {
    severity: "medium",
    title: "Site can be embedded in other sites (clickjacking)",
    impact: "Attackers can load your pages invisibly inside their own page and trick users into clicking buttons (e.g. \"buy\", \"change email\").",
    fix: "Send one of:\n  X-Frame-Options: SAMEORIGIN\n  Content-Security-Policy: frame-ancestors 'self'\n\nNginx: add_header X-Frame-Options SAMEORIGIN always;\nApache: Header always set X-Frame-Options SAMEORIGIN",
    diyFriendly: true,
  },
  "headers.nosniff-missing": {
    severity: "low",
    title: "Missing X-Content-Type-Options header",
    impact: "Browsers may interpret uploaded files as scripts, making some upload-based attacks easier.",
    fix: "Add: X-Content-Type-Options: nosniff\n\nNginx: add_header X-Content-Type-Options nosniff always;\nApache: Header always set X-Content-Type-Options nosniff",
    diyFriendly: true,
  },
  "headers.referrer-policy-missing": {
    severity: "low",
    title: "Missing Referrer-Policy header",
    impact: "Full page URLs (which may include order IDs, reset tokens or search terms) leak to third-party sites your pages link to.",
    fix: "Add: Referrer-Policy: strict-origin-when-cross-origin\n\nNginx: add_header Referrer-Policy strict-origin-when-cross-origin always;",
    diyFriendly: true,
  },
  "headers.permissions-policy-missing": {
    severity: "info",
    title: "Missing Permissions-Policy header",
    impact: "Embedded third-party content could request camera, microphone or location access in your site's name.",
    fix: "Add: Permissions-Policy: camera=(), microphone=(), geolocation=()",
    diyFriendly: true,
  },

  // ---------- Cookies ----------
  "cookies.insecure-flags": {
    severity: "medium",
    title: "Cookies are missing security flags",
    impact: "Session cookies without Secure/HttpOnly/SameSite can be stolen by injected scripts or sent over unencrypted connections, letting attackers log in as your customers.",
    fix: "Set every session/auth cookie with: Secure; HttpOnly; SameSite=Lax\n\nPHP (php.ini): session.cookie_secure=1, session.cookie_httponly=1, session.cookie_samesite=Lax\nExpress: cookie: { secure: true, httpOnly: true, sameSite: 'lax' }",
    diyFriendly: false,
  },

  // ---------- Exposed files ----------
  "exposed.env": {
    severity: "critical",
    title: "Environment file (.env) is publicly downloadable",
    impact: "This file usually holds database passwords, payment-gateway keys and email credentials. Anyone can take over your database or payment account.",
    fix: "1. Block access immediately (deny dotfiles in your web server config).\n2. Assume every secret in it is compromised: rotate DB passwords, API keys, payment keys.\n3. Move the file outside the public web root.",
    diyFriendly: false,
  },
  "exposed.git": {
    severity: "critical",
    title: "Git repository (.git) is publicly accessible",
    impact: "Attackers can download your full source code and history, including any passwords or keys ever committed.",
    fix: "Block /.git in the web server, remove the folder from the deployed web root, and rotate any secrets ever committed to the repository.",
    diyFriendly: false,
  },
  "exposed.backup": {
    severity: "high",
    title: "Backup or database dump is publicly downloadable",
    impact: "Backups often contain customer data and password hashes. Exposure may be a reportable data breach (POPIA/GDPR).",
    fix: "Delete backups from the public web root, store them in private storage, and review access logs to see whether they were downloaded.",
    diyFriendly: false,
  },
  "exposed.phpinfo": {
    severity: "high",
    title: "phpinfo() page is exposed",
    impact: "Reveals server paths, versions, configuration and sometimes secrets, giving attackers a map of your server.",
    fix: "Delete the phpinfo file from the server.",
    diyFriendly: false,
  },
  "exposed.server-status": {
    severity: "medium",
    title: "Server status page is public",
    impact: "Shows live visitor IPs and URLs being requested, including private pages.",
    fix: "Restrict /server-status to localhost (Apache: Require local) or disable mod_status.",
    diyFriendly: false,
  },
  "exposed.directory-listing": {
    severity: "medium",
    title: "Directory listing is enabled",
    impact: "Anyone can browse folders and download files you never linked to (uploads, invoices, backups).",
    fix: "Disable auto-indexing. Apache: Options -Indexes. Nginx: autoindex off;",
    diyFriendly: false,
  },

  // ---------- CMS / libraries ----------
  "cms.wp-user-enum": {
    severity: "medium",
    title: "WordPress usernames are publicly listed",
    impact: "Attackers get valid admin usernames for free, which makes password-guessing attacks against wp-login much more effective.",
    fix: "Restrict the /wp-json/wp/v2/users endpoint to logged-in users (security plugin setting or a small mu-plugin), and enforce 2FA for admin accounts.",
    diyFriendly: false,
  },
  "cms.wp-xmlrpc": {
    severity: "medium",
    title: "WordPress XML-RPC is enabled",
    impact: "xmlrpc.php is widely abused for brute-force login attacks (hundreds of passwords per request) and DDoS amplification.",
    fix: "Disable XML-RPC unless you use the mobile app or Jetpack: block /xmlrpc.php in the web server or use a security plugin.",
    diyFriendly: false,
  },
  "cms.version-disclosed": {
    severity: "low",
    title: "CMS version is publicly disclosed",
    impact: "Attackers use the exact version to look up known exploits for your site.",
    fix: "Remove the generator meta tag / version strings and, more importantly, keep the CMS and plugins updated.",
    diyFriendly: false,
  },
  "cms.outdated-jquery": {
    severity: "medium",
    title: "Outdated JavaScript library with known vulnerabilities",
    impact: "Old jQuery versions have published cross-site-scripting flaws that can be used to steal sessions or inject content.",
    fix: "Upgrade jQuery to 3.7+ (test plugins that depend on it), or update the theme/plugins that bundle it.",
    diyFriendly: false,
  },

  // ---------- CORS ----------
  "cors.reflected-credentials": {
    severity: "high",
    title: "CORS allows any website to read logged-in user data",
    impact: "A malicious site can silently read your customers' account data from their browser while they are logged in to your site.",
    fix: "Only allow a fixed list of trusted origins; never echo back the request's Origin header when Access-Control-Allow-Credentials is true.",
    diyFriendly: false,
  },
  "cors.wildcard": {
    severity: "low",
    title: "CORS is open to all origins (*)",
    impact: "Any website can read these responses. Fine for public data, risky if any private data is ever served here.",
    fix: "Replace Access-Control-Allow-Origin: * with the specific origins that need access.",
    diyFriendly: false,
  },

  // ---------- Email spoofing ----------
  "email.spf-missing": {
    severity: "medium",
    title: "No SPF record: email can be spoofed",
    impact: "Scammers can send emails that appear to come from your domain (fake invoices, fake order confirmations) and they are more likely to reach inboxes.",
    fix: "Add a TXT record on your root domain listing who may send for you, e.g.:\n  v=spf1 include:_spf.google.com ~all   (Google Workspace)\n  v=spf1 include:spf.protection.outlook.com ~all   (Microsoft 365)\nAdd one include: per service that sends mail for you (newsletter tool, shop platform).",
    diyFriendly: true,
  },
  "email.dmarc-missing": {
    severity: "medium",
    title: "No DMARC record: email can be spoofed",
    impact: "Receiving mail servers have no instructions to reject fake emails using your domain, a common route for invoice fraud against your customers.",
    fix: "Add a TXT record at _dmarc.yourdomain:\n  v=DMARC1; p=none; rua=mailto:dmarc@yourdomain\nMonitor the reports for 2–4 weeks, then tighten to p=quarantine and finally p=reject.",
    diyFriendly: true,
  },
  "email.dmarc-none": {
    severity: "low",
    title: "DMARC is in monitor-only mode (p=none)",
    impact: "Spoofed emails are reported but still delivered.",
    fix: "Once legitimate senders pass SPF/DKIM, change the policy to p=quarantine, then p=reject.",
    diyFriendly: true,
  },

  // ---------- Content ----------
  "mixed.content": {
    severity: "medium",
    title: "Secure pages load insecure (http://) resources",
    impact: "Browsers block or warn about these resources (broken layout or a missing padlock), and injected http scripts can be altered in transit.",
    fix: "Change resource URLs to https:// (or protocol-relative //). In WordPress, a search-replace of http://yourdomain → https://yourdomain in the database usually fixes it. Also add the CSP directive: upgrade-insecure-requests.",
    diyFriendly: true,
  },

  // ---------- Information leakage ----------
  "leak.server-version": {
    severity: "low",
    title: "Web server version is disclosed",
    impact: "Tells attackers exactly which software version to target.",
    fix: "Nginx: server_tokens off;\nApache: ServerTokens Prod and ServerSignature Off",
    diyFriendly: true,
  },
  "leak.powered-by": {
    severity: "low",
    title: "Technology stack is disclosed (X-Powered-By)",
    impact: "Reveals backend language/framework versions, helping attackers pick exploits.",
    fix: "PHP: expose_php = Off in php.ini.\nExpress: app.disable('x-powered-by').\nASP.NET: remove X-Powered-By / X-AspNet-Version in web.config.",
    diyFriendly: true,
  },

  // ---------- Load / stress ----------
  "load.high-error-rate": {
    severity: "high",
    title: "Site starts failing under moderate traffic",
    impact: "During a promotion, Black Friday or a small bot attack, customers will see errors and you lose sales. It also suggests the site would go down easily under a DDoS.",
    fix: "Add caching (page cache / CDN), check database connection limits and slow queries, raise PHP-FPM/worker limits, and put the site behind a CDN with rate limiting.",
    diyFriendly: false,
  },
  "load.slow": {
    severity: "medium",
    title: "Site becomes slow under load",
    impact: "Slow pages lose customers: each extra second of load time measurably drops conversions, and search rankings suffer.",
    fix: "Enable full-page caching and a CDN for static assets, compress and resize images, and profile the slowest database queries.",
    diyFriendly: false,
  },
};

export function catalogEntry(key: string): CatalogEntry {
  const e = CATALOG[key];
  if (!e) throw new Error(`Unknown finding key: ${key}`);
  return e;
}
