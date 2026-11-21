import type { BlogPost } from "../types";

export const post: BlogPost = {
  slug: "will-your-online-store-survive-black-friday",
  title: "Will your online store survive Black Friday? A 10-minute readiness check",
  description:
    "Black Friday is 27 November. Here's how to find out, before your customers do, whether your online store slows down or crashes under a rush of traffic, and what to fix first.",
  publishedAt: "2026-11-24",
  authorId: "founder",
  pillar: "ecommerce",
  tags: ["black friday", "online store", "stress test", "woocommerce", "shopify", "south africa"],
  fixesFindings: ["load.high-error-rate", "load.slow"],
  draft: true,
  body: `
**Short answer:** most online stores don't fail on Black Friday because of hackers. They fail because the site was never tested with more than a handful of visitors at once. You can find out how yours behaves in about ten minutes by sending it a controlled burst of traffic and watching two numbers: **how many requests fail** and **how slow the slowest pages get**.

Black Friday falls on **Friday, 27 November 2026**. If you run a store, the week before is your last calm window to test and fix. This guide shows you how.

## Why online stores slow down or crash under traffic

A normal day might bring one or two visitors to your store at the same moment. A Black Friday email blast or a WhatsApp broadcast can bring dozens in the same minute. Each visitor's page load asks your server to do work, and the problems show up when that work piles up:

- **Pages built from scratch on every visit.** WooCommerce and most WordPress shops build each page from the database on every request unless page caching is switched on. Ten visitors means ten times the work.
- **A database that can't keep up.** Product searches, filters and cart updates are database-heavy. When queries queue up, everything behind them waits.
- **Hosting plan limits.** Shared and entry-level plans cap how many processes can run at once. Past that limit, extra visitors get errors (often \`503 Service Unavailable\` or \`508 Resource Limit Reached\`).
- **Heavy plugins and third-party scripts.** Pop-ups, live chat, tracking pixels and review widgets each add requests. One slow third-party script can stall the whole page.
- **Big, unoptimised images.** A homepage with several multi-megabyte banners is slow for everyone, and slower still on mobile data.

Hosted platforms like Shopify absorb most of the server load for you, but themes, apps and huge images can still make pages crawl. That's worth checking too.

{{SCAN_CTA}}

## The 10-minute readiness check

### 1. Run a free security scan (1 minute)

Start with the basics an attacker, or your payment provider, would notice first: an expiring SSL certificate, missing HTTPS redirects, or a missing Content-Security-Policy, which leaves checkout pages open to card-skimming scripts. The free scan reads only what any visitor's browser sees, and takes under a minute.

### 2. Run the stress test (about 5 minutes)

The stress test is part of the **deep scan**. Because it actively sends traffic, the site owner approves it first with one click: we email an approval link to a mailbox at your own domain, such as \`info@yourstore.co.za\`.

Once approved, the test ramps up from a handful of visitors to **50 simultaneous visitors over 30 seconds**, then reports what happened. It's built to be safe for a live store:

- It is capped at 50 simultaneous visitors and 30 seconds, and only requests your homepage.
- It **stops automatically** if your site starts returning errors, so it measures the breaking point without pushing past it.
- It can run at most once per site per day.

Run it at a quiet time of day, and let your host know if you're on a small shared plan.

### 3. Read the results (2 minutes)

You'll see four numbers. These two matter most:

| Result | Healthy | Worth fixing before Friday |
|---|---|---|
| **Error rate** | 0% | Anything above about 1%, and urgent above 5% |
| **Slowest 5% of pages (p95)** | Under about 1 second | Over 3 seconds |

- **Errors** mean some visitors got a broken page instead of your store. On Black Friday, that's a lost sale every time.
- **The slowest 5%** shows what your unluckiest visitors experience as traffic builds. If it climbs steeply as visitors increase, your server is queueing work.

If the test **stopped early**, your store started failing before reaching 50 visitors. That's the most important result to act on.

### 4. Test your checkout by hand (2 minutes)

Automated tests load pages; they don't buy anything. Place a real low-value order on your phone, using mobile data rather than Wi-Fi, from product page to payment confirmation. Watch for slow steps, broken payment redirects, and order emails that don't arrive.

## What to fix first (in order of impact)

1. **Turn on page caching.** On WordPress/WooCommerce, use your host's built-in cache or a reputable caching plugin. Cart, checkout and account pages must stay *uncached*; most caching plugins exclude them automatically, but check.
2. **Put a CDN in front of your store.** A free Cloudflare plan caches images, CSS and JavaScript close to your visitors and absorbs traffic spikes.
3. **Shrink your images.** Resize banners to the size they're actually displayed at and serve modern formats like WebP. This often gives the biggest speed win for the least effort.
4. **Remove what you don't need.** Deactivate plugins, apps and scripts you aren't actively using, especially pop-ups and widgets that load on every page.
5. **Talk to your host before Friday.** Ask what your plan's limits are and whether you can temporarily upgrade for the weekend. Most hosts would much rather hear from you on Monday than during an outage on Friday.
6. **Re-test.** Run the stress test again after your changes (it's limited to once per day per site) and compare.

## Don't forget security on your busiest weekend

Busy sales periods attract criminals as well as shoppers. Two quick checks:

- **Is your SSL certificate valid past the weekend?** An expired certificate shows a full-page browser warning, and nobody checks out past that. The free scan flags certificates close to expiry.
- **Could someone send fake invoices or "order problem" emails from your domain?** Without SPF and DMARC records, scammers can spoof your email address to your customers. The free scan checks both.

## A simple Black Friday plan

- **This week:** run the scan and stress test, fix the top issues, re-test.
- **Thursday:** take a full backup, confirm your hosting limits, and freeze changes. No new plugins or theme updates until Monday.
- **Friday:** keep an eye on your store and your host's status page, and keep a short "we're experiencing high demand" message ready in case you need it.

## Need help fixing it?

If your results show errors or slow pages and you'd rather not dig into hosting settings this week, the report has an option to request a fixed-price quote from our team. You can also start with the free scan below and take it from there.
`,
};
