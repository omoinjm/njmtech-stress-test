# Blog Strategy: NJM Tech Security

## Executive Summary
The blog lives at `security.njmtech.co.za/blog` and has one job: **turn problem-aware South African business owners into free scans**. Every post answers a question owners actually search for ("is my website secure?", "my site was hacked", "can scammers send invoices from my domain?"), then hands them the scanner. The competitive edge is something no hosting blog or global tool has: **first-party scan data on South African websites**, plus **fix guides that map one-to-one to the scanner's own findings**. Cadence is 1 post per week, so the 90-day plan builds two clusters properly instead of five thinly.

---

## Audience

### Segment 1: The owner-operator (primary)
- **Who:** Owns a small business with a website or online store (WordPress, WooCommerce, Shopify, Wix). Non-technical; the site was built by a freelancer or agency who has moved on.
- **Pain points:** "Is my site safe?", a "Not secure" warning, a sudden spam redirect, a client who received a fake invoice "from us", POPIA anxiety.
- **Search behaviour:** `is my website secure`, `website hacked what to do`, `website not secure warning`, `check if my website is safe`, `POPIA website requirements`.
- **AI behaviour:** Asks ChatGPT "how do I know if my website has been hacked" and "what does POPIA require for my website".
- **Content preference:** Plain language, short checklists, "do this now" steps, reassurance, a clear price.
- **Buying stage:** Awareness → Decision (fast when something is broken).

### Segment 2: The e-commerce manager
- **Who:** Runs an online store that depends on peak periods (Black Friday, festive season, payday weekends).
- **Pain points:** Site crashes under traffic, checkout card skimming, payment-gateway (PCI) requirements.
- **Search behaviour:** `website crash black friday`, `load test my website`, `woocommerce security`, `card skimming online store`.
- **Buying stage:** Consideration (seasonal urgency).

### Segment 3: The freelancer or agency (secondary, referral channel)
- **Who:** Builds sites for SMEs and wants to deliver a "secure handover".
- **Pain points:** Needs proof that the site is secure, plus a client-friendly report.
- **Search behaviour:** `security headers nginx`, `CSP example`, `wordpress hardening checklist`.
- **Buying stage:** Consideration. Can become a reseller or partner later.

---

## Competitive Positioning

| Competitor type | Examples | Strength | Gap we exploit |
|---|---|---|---|
| SA hosting blogs | [domains.co.za](https://www.domains.co.za/blog/improve-the-security-of-your-website/), [xneelo insights](https://xneelo.co.za/insights/what-to-do-if-your-website-is-hacked/), 1grid | Domain authority, local trust | Generic advice, no testing tool, no fix service, few platform-specific fixes |
| Local IT support (MSP) blogs | [ctbedfordview](https://ctbedfordview.co.za/blog/cybercrime-south-africa-2026-sme), wired-it, simplified-it | Local SME focus | About networks and endpoints, not websites; recycled, unsourced statistics |
| Global scanners | [Mozilla Observatory](https://www.pcworld.com/article/3112335/mozilla-launches-free-website-security-scanning-service.html), [securityheaders.com](https://scotthelme.co.uk/introducing-securityheaders-io/), [ImmuniWeb](https://www.immuniweb.com/websec/about/) | Trusted tools | Developer-facing, no SA context (POPIA, local hosts), no "we'll fix it" path |
| Global security vendors | Sucuri, Wordfence, Kinsta | Deep WordPress content | Not local, upsell-heavy, no stress test |
| POPIA and legal blogs | [Michalsons](https://www.michalsons.com/blog/what-low-risk-small-business-should-and-shouldnt-do-for-popia/49374), [SME South Africa](https://smesouthafrica.co.za/sme-guides/guide-to-popia/) | Legal authority | Policy only, never "here's how to check your actual website" |

**Our position:** *"Check your website free in a minute, understand the result in plain English, and get it fixed by a local team."* We are the only one connecting **finding → explanation → fix guide → done-for-you fix**.

**Credibility rule:** the SA competitor blogs recycle unsourced statistics, such as "60% of SMEs close within 6 months". We only cite traceable sources (the [Kaspersky SA SMB research](https://lifestyleandtech.co.za/ai-cloud/article/2026-08-31/78-of-south-african-smbs-encountered-cybersecurity-incidents-over-the-past-year-kaspersky-research-shows), SABRIC, the Information Regulator) or **our own scan data**.

### Competitive AI Citation Map
I couldn't check ChatGPT, Perplexity or AI Overviews directly from here, so these cells are **unknown** until the Month 1 manual audit.

| Query | ChatGPT | Perplexity | AI Overview | Gap? |
|---|---|---|---|---|
| how to check if my website is secure south africa | unknown | unknown | unknown | audit in Month 1 |
| website hacked what to do south africa | unknown | unknown | unknown | audit in Month 1 |
| popia website security requirements | unknown | unknown | unknown | audit in Month 1 |
| stop scammers sending invoices from my domain | unknown | unknown | unknown | audit in Month 1 |
| will my online store crash on black friday | unknown | unknown | unknown | audit in Month 1 |

---

## Content Pillars & Cluster Architecture

Four pillars; **Pillars 1 and 2 are built in the first 90 days**. Pillars 3 and 4 come after.

### Pillar 1: "Is my website secure?" (website security check)
- **Purpose:** Capture the highest-volume, highest scan-intent searches.
- **Primary keywords:** `check if website is secure`, `website security check`, `is my website safe`, `website security south africa`, `free website security scan`.
- **Unique angle:** Every check in the post is something our scanner actually does. The post *is* the scan, explained.
- **AI citation potential:** High. Definitional "how do I check X" questions with clear, self-contained answers.

| # | Title | Template | Target keyword | Words | Links |
|---|---|---|---|---|---|
| P | How to check if your website is secure: a South African small-business guide | pillar-page | check if website is secure | 3,000–3,500 | → all spokes |
| 1 | Why does my website say "Not secure"? (and how to fix it today) | how-to-guide | website says not secure | 1,500 | P, 2, 5 |
| 2 | SSL certificate expired: what it costs you and how to stop it happening again | how-to-guide | ssl certificate expired | 1,500 | P, 1 |
| 3 | Security headers explained: the 6 headers every business site needs (copy-paste fixes) | tutorial | security headers | 2,000–2,500 | P, Pillar 2 hub |
| 4 | Exposed .env and .git files: the silent leak that hands attackers your passwords | how-to-guide | exposed env file | 1,500–2,000 | P, 7 |
| 5 | Free website security scanners compared: Observatory vs SecurityHeaders vs NJM Tech Security | comparison | free website security scanner | 2,000 | P, 3 |
| 6 | We scanned N South African small-business websites: here's what we found | data-research | south african website security statistics | 2,000–2,500 | P + every spoke |
| 7 | WordPress security checklist for South African businesses | listicle | wordpress security checklist | 2,000 | P, 4, Pillar 3 |
| 8 | Can scammers send invoices from your domain? SPF, DKIM and DMARC for SA businesses | how-to-guide | stop email spoofing domain / dmarc south africa | 2,000 | P, Pillar 4 |

### Pillar 2: Fix guides (one post per scanner finding)
- **Purpose:** Bottom of the funnel. People whose report (ours or anyone's) flagged an issue search the exact finding. It's also **product support**: every finding in a report links to its fix guide.
- **Primary keywords:** `how to fix missing hsts header`, `add content security policy wordpress`, `x-frame-options cloudflare`, `secure httponly cookie php`, `enable dmarc cloudflare`.
- **Unique angle:** Platform-specific fixes (cPanel/Apache, Nginx, Cloudflare, WordPress, Shopify, Wix) taken from `lib/findings/catalog.ts`, which is already written and accurate.
- **AI citation potential:** High. Precise, copyable answers.

| # | Title | Template | Words | Links |
|---|---|---|---|---|
| P | How to fix the most common website security problems (fix-guide hub) | pillar-page | 3,000 | → all fix guides + Pillar 1 |
| 1 | How to add HSTS (Cloudflare, cPanel, Nginx, WordPress) | tutorial | 1,500 | P, 2 |
| 2 | How to stop clickjacking: X-Frame-Options and frame-ancestors | tutorial | 1,500 | P, 1, 3 |
| 3 | Content-Security-Policy for non-developers: start in report-only mode | tutorial | 2,000 | P, 2 |
| 4 | Securing session cookies: Secure, HttpOnly and SameSite explained | tutorial | 1,500 | P |
| 5 | Force HTTPS: redirect HTTP to HTTPS on any host | tutorial | 1,500 | P, Pillar 1 #1 |
| 6 | Turn off WordPress XML-RPC and hide your admin usernames | tutorial | 1,500 | P, Pillar 1 #7 |
| 7 | Hide your server version (server_tokens, ServerTokens, X-Powered-By) | tutorial | 1,200 | P |
| 8 | Fix mixed content warnings on WordPress and Shopify | tutorial | 1,500 | P, Pillar 1 #1 |

### Pillar 3 (after 90 days): "My website was hacked" (incident response, South Africa)
Highest-converting to **paid fixes**, because the reader's problem is urgent. Spokes: first 24 hours, signs of a hack, removing the "This site may be hacked" warning, getting off Google and email blacklists, whether to notify the Information Regulator (POPIA s22), and what a hack cleanup costs in SA.

### Pillar 4 (after 90 days): POPIA and website security
SA-specific authority. Spokes: what s19 "security safeguards" mean for a website, POPIA checklist for online stores, contact forms and personal data, breach notification steps. **Legal accuracy rule:** cite the Act and the Information Regulator, add a "not legal advice" note, and have a legal professional review before publishing.

### Seasonal / e-commerce track (ongoing, can be inserted)
Load-test hooks around **Black Friday, the festive season and payday weekends**: "Will your online store survive Black Friday?", "Why online stores crash under traffic (and what to fix first)", "Card skimming on online stores: how Magecart attacks work".

### Internal linking rules
- Every spoke links to its pillar in the first 150 words, using descriptive anchors (not "click here").
- Pillars link to every spoke.
- Spokes cross-link where the table says so.
- **Product links:** every post ends with a scan CTA, and every finding in a scan report gets a "How to fix this →" link to the matching Pillar 2 guide. This is a small product change, keyed by finding `key`.

---

## Differentiation (E-E-A-T)

| Signal | Implementation |
|---|---|
| **Original data** | Quarterly *"State of SA Small-Business Website Security"* built from **aggregated, anonymised** public-scan results: % missing HSTS, % with no DMARC, % on expiring certificates, and so on. Never name or identify a site. |
| **Case studies** | With client permission: "How we fixed X for a Durban online store" (before/after score, time to fix). |
| **Build in public** | How the scanner works, why the deep scan needs owner approval, how the 50-user stress test protects the site. Transparency builds trust. |
| **Hands-on testing** | Screenshots of real fixes on Cloudflare, cPanel and Shopify, tested before publishing. |
| **Named author** | Founder byline with a short bio and real credentials, and an Organization page for NJM Tech. |

---

## AI Citation Surface Strategy

### On-site
- Put the direct answer first in each section (1–3 sentences), then the details.
- Use question headings where they match search intent ("How do I know if my website has been hacked?"); declarative otherwise.
- Keep entity names consistent: always "NJM Tech Security", "free website security scan", "deep scan", "stress test".
- Add JSON-LD on every post: `BlogPosting`, `Person` (author), `Organization`, `BreadcrumbList`. Add `FAQPage` only where real FAQs exist (entity markup, not a rich-result tactic).
- Make copyable answers: code blocks for fixes, short tables for comparisons.

### Off-site (for those audiences, not as a "citation hack")
| Channel | Action |
|---|---|
| Reddit (r/southafrica, r/webdev, r/Wordpress, r/smallbusiness) | Answer "was my site hacked?" questions genuinely, linking only when it helps |
| LinkedIn | Founder posts with one chart from the SA scan data each month |
| YouTube | 3–5 minute screen recordings: "Fix this in Cloudflare in 2 minutes" for the top fix guides |
| Local media | Pitch the quarterly SA data report to BusinessTech, TechCentral, MyBroadband, ITWeb |
| Hosting and agency partners | Offer the free scan as a tool their customers can use |

### Monitoring
Each month, run the 5 queries above on ChatGPT, Perplexity and Google (AI Overviews and AI Mode). Log who's cited, in a separate log from organic rankings. Track AI referral traffic in analytics (source contains chatgpt, perplexity, claude).

---

## Content Quality Standards

| Metric | Target | Measured by |
|---|---|---|
| Blog quality score | 80+ | `/blog analyze` |
| Claim support | Every statistic traceable to a primary source or our own data | Manual review |
| Technical accuracy | Every fix tested on the named platform before publishing | Author checklist |
| Scan CTA | 1 inline (after the first answer) + 1 at the end | Editorial review |
| Internal links | Pillar link + 2 related spokes + product link | Link audit |
| Schema | BlogPosting + Person + Organization + BreadcrumbList validate | Rich Results / Schema test |
| Freshness | Fix guides re-checked every 6 months; data report quarterly | Calendar |

---

## Content Velocity
- **New posts:** 1 per week (about 13 in 90 days)
- **Refreshes:** from Month 3, 1 per month (update stats and screenshots)
- **Visuals:** 1 annotated screenshot or chart per post where it helps (scan results, before/after headers)

---

## 90-Day Roadmap (1 post/week)

### Month 1: Foundation (and a timely win)
- [ ] **Week 1 (publish before Wed 25 Nov):** *Will your online store survive Black Friday? A 10-minute readiness check* (seasonal; CTA to deep scan + stress test). Black Friday 2026 is Fri 27 Nov.
- [ ] Week 2: **Pillar 1:** *How to check if your website is secure (SA guide)*
- [ ] Week 3: *Can scammers send invoices from your domain? SPF, DKIM, DMARC* (BEC is a top SA threat)
- [ ] Week 4: *Why does my website say "Not secure"?*
- [ ] Build: `/blog` route (MDX), BlogPosting/Person/Organization schema, author page, sitemap, RSS
- [ ] Baseline: Search Console + analytics; manual AI citation audit of the 5 queries

### Month 2: Fix-guide engine
- [ ] Week 5: **Pillar 2 hub:** *How to fix the most common website security problems*
- [ ] Week 6: *Security headers explained (copy-paste fixes)*
- [ ] Week 7: *How to add HSTS*
- [ ] Week 8: *Exposed .env and .git files*
- [ ] Product: add a "How to fix this →" link to each finding in the report
- [ ] Start Reddit and LinkedIn distribution

### Month 3: Data and optimisation
- [ ] Week 9: *We scanned N South African websites: here's what we found* (first data report; pitch to SA tech media)
- [ ] Week 10: *WordPress security checklist for SA businesses*
- [ ] Week 11: *Free website security scanners compared*
- [ ] Week 12: *Content-Security-Policy for non-developers*
- [ ] Week 13: *Festive-season readiness* (seasonal), or start Pillar 3 with *My website was hacked: first 24 hours*
- [ ] Run `/blog analyze` on every post; revise anything below 80
- [ ] Re-run the AI citation audit and compare with the Month 1 baseline

---

## Measurement

| Area | KPI |
|---|---|
| **Leads (primary)** | Free scans started from blog traffic (add `?src=blog-<slug>` to the CTA and record it on the scan), plus scan → unlock → fix conversion by post |
| SEO | Organic clicks and impressions (Search Console), top-10 keywords per cluster |
| AI | Citations across the 5 tracked queries (monthly manual log), AI referral sessions |
| Quality | `/blog analyze` score ≥ 80, % of posts refreshed on schedule |
| Business | Revenue from report unlocks and fix work attributed to blog-sourced scans |

---

## Product Changes This Strategy Needs (small)
1. A `/blog` section on `security.njmtech.co.za` (MDX posts, schema, sitemap and RSS).
2. Record `src` on scans so blog → scan → payment is measurable.
3. A "How to fix this →" link on each report finding, keyed to its Pillar 2 guide.
4. (Month 3) An internal aggregate-stats query over public scans for the data report. Anonymised counts only.

## Reference Documents
- `skills/blog/references/internal-linking.md`: hub-and-spoke model, anchor text rules
- `skills/blog/references/distribution-playbook.md`: channel tactics
- `skills/blog/references/geo-optimization.md`: AI-citation tactics
- `skills/blog/references/content-templates.md`: the 12 templates

## Next Steps
1. `/blog brief` for **Week 1: "Will your online store survive Black Friday?"** (it has a deadline)
2. Build the `/blog` section + source tracking on scans
3. `/blog calendar` to lock in the Month 1 dates
4. `/blog write` for the Pillar 1 page

## Sources
- [domains.co.za: improve the security of your website](https://www.domains.co.za/blog/improve-the-security-of-your-website/)
- [domains.co.za: cyber threats in South Africa](https://www.domains.co.za/blog/cyber-threats-in-south-africa/)
- [xneelo: what to do if your website is hacked](https://xneelo.co.za/insights/what-to-do-if-your-website-is-hacked/)
- [BusinessTech / Axxess: "too small to be a target"](https://businesstech.co.za/news/industry-news/870896/too-small-to-be-a-target-cybercriminals-are-counting-on-you-thinking-that/)
- [Michalsons: POPIA for low-risk small businesses](https://www.michalsons.com/blog/what-low-risk-small-business-should-and-shouldnt-do-for-popia/49374)
- [SME South Africa: guide to POPIA](https://smesouthafrica.co.za/sme-guides/guide-to-popia/)
- [coolhost: 2025 POPIA checklist for small business websites](https://coolhost.co.za/?p=8472)
- [Kaspersky via Lifestyle & Tech: 78% of SA SMBs had incidents](https://lifestyleandtech.co.za/ai-cloud/article/2026-08-31/78-of-south-african-smbs-encountered-cybersecurity-incidents-over-the-past-year-kaspersky-research-shows)
- [ctbedfordview: cybercrime in SA 2026](https://ctbedfordview.co.za/blog/cybercrime-south-africa-2026-sme)
- [Mozilla Observatory launch (PCWorld)](https://www.pcworld.com/article/3112335/mozilla-launches-free-website-security-scanning-service.html)
- [securityheaders.com (Scott Helme)](https://scotthelme.co.uk/introducing-securityheaders-io/)
- [ImmuniWeb website security test](https://www.immuniweb.com/websec/about/)
- [WordPress.org: "my site was hacked" FAQ](https://wordpress.org/documentation/article/faq-my-site-was-hacked/)
