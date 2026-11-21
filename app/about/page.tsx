import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui";

const SITE = "https://security.njmtech.co.za";

export const metadata: Metadata = {
  title: "About NJM Tech Security",
  description: "Who runs NJM Tech Security, how our website security scans work and stay safe, how we make money, and the editorial standards behind our blog.",
  alternates: { canonical: "/about" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  url: `${SITE}/about`,
  name: "About NJM Tech Security",
  mainEntity: {
    "@type": "Organization",
    "@id": `${SITE}/#org`,
    name: "NJM Tech",
    url: "https://njmtech.co.za",
    brand: { "@type": "Brand", name: "NJM Tech Security" },
    areaServed: "ZA",
    founder: { "@type": "Person", name: "Nhlanhla Malaza", sameAs: ["https://github.com/omoinjm"] },
    contactPoint: { "@type": "ContactPoint", contactType: "customer support", url: `${SITE}/contact`, availableLanguage: "en" },
  },
};

const h2 = "mt-2 text-xl font-semibold";
const p = "mt-2 text-slate-600 dark:text-slate-300";

export default function AboutPage() {
  return (
    <article className="mx-auto grid max-w-3xl gap-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">About NJM Tech Security</h1>
        <p className={p}>
          NJM Tech Security helps South African businesses find and fix the security problems on their websites, online
          stores and web apps, before attackers or customers find them first.
        </p>
      </header>

      <Card>
        <h2 className={h2}>Who we are</h2>
        <p className={p}>
          NJM Tech Security is built and run by <strong>NJM Tech</strong>, a South African software business founded by
          Nhlanhla Malaza. We build and look after websites and web apps for businesses, and we built this scanner because
          most small businesses have no easy way to see what an attacker sees.
        </p>
      </Card>

      <Card>
        <h2 className={h2}>How our scans work, and how we keep them safe</h2>
        <ul className="mt-2 list-disc space-y-2 pl-5 text-slate-600 dark:text-slate-300">
          <li><strong>Free public scan:</strong> reads only what any visitor&apos;s browser already receives: your homepage, its certificate and public DNS records. No probing, no logins, no load.</li>
          <li><strong>Deep scan and stress test:</strong> actively test the site, so they only run after a one-click approval from someone at the website&apos;s own domain. The stress test is capped at 50 simultaneous visitors for 30 seconds and stops automatically if the site starts failing.</li>
          <li><strong>Your results are confidential.</strong> Reports are visible only to you (and to us, to prepare a quote if you ask for one). Report pages are never recorded by our analytics.</li>
        </ul>
        <p className={p}>Full details are in our <Link href="/terms" className="text-emerald-600 underline">scanning terms</Link>.</p>
      </Card>

      <Card>
        <h2 className={h2}>How we make money</h2>
        <p className={p}>
          The public scan is free, and every report includes one complete fix at no cost. We earn money in two optional ways:
          unlocking the full report with step-by-step fixes, and fixing the issues for you at a fixed price you agree to
          upfront. You never have to buy anything to use the free scan or follow the free fix.
        </p>
      </Card>

      <Card>
        <h2 className={h2}>Editorial standards for our blog</h2>
        <ul className="mt-2 list-disc space-y-2 pl-5 text-slate-600 dark:text-slate-300">
          <li><strong>Sources:</strong> statistics and factual claims link to the primary source (standards bodies, official documentation, original research). We don&apos;t repeat numbers we can&apos;t trace.</li>
          <li><strong>Accuracy:</strong> fixes are written for the platforms they name, and we say when a threshold is our own rule of thumb rather than an industry standard.</li>
          <li><strong>Updates and corrections:</strong> when we materially change an article, we show an &quot;Updated&quot; date. Spotted a mistake? <Link href="/contact" className="text-emerald-600 underline">Tell us</Link> and we&apos;ll correct it.</li>
          <li><strong>AI assistance:</strong> some articles are drafted with AI tools. A person reviews, fact-checks and approves every article before it&apos;s published.</li>
        </ul>
      </Card>

      <Card>
        <h2 className={h2}>Get in touch</h2>
        <p className={p}>
          Questions, partnership ideas or corrections: <Link href="/contact" className="text-emerald-600 underline">contact us</Link>.
          Want to see how your own site is doing? <Link href="/" className="text-emerald-600 underline">Run the free scan</Link>.
        </p>
      </Card>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </article>
  );
}
