import type { Metadata } from "next";
import { StartScanForm } from "@/components/forms";
import { Card } from "@/components/ui";

export const metadata: Metadata = {
  title: "Free Website Security Check for South African Businesses | NJM Tech Security",
  description:
    "Scan your website free in under a minute: HTTPS, security headers, exposed files, email spoofing and more. Get one fix free and let our team fix the rest.",
  alternates: { canonical: "/" },
};

const CHECKS = [
  ["🔒", "HTTPS & certificates", "Expired or weak certificates, missing redirects, outdated TLS."],
  ["🧱", "Security headers", "Protection against clickjacking, script injection and card skimming."],
  ["📂", "Exposed files (deep scan)", "Leaked .env passwords, Git repositories, database backups."],
  ["🛒", "CMS & plugins", "WordPress user leaks, XML-RPC abuse, vulnerable libraries."],
  ["✉️", "Email spoofing", "Can scammers send fake invoices from your domain?"],
  ["⚡", "Stress test (deep scan)", "How your site holds up when traffic spikes."],
];

export default function Home() {
  return (
    <div className="grid gap-12">
      <section className="grid gap-6 pt-6 text-center">
        <p className="mx-auto rounded-full bg-emerald-600/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
          For online stores, business websites and web apps
        </p>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Is your website an easy target?
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-slate-600 dark:text-slate-400">
          A free security check in under a minute. No sign-up, no setup. See what attackers see, get one fix free,
          and let our team handle the rest.
        </p>
        <Card className="mx-auto w-full max-w-3xl text-left">
          <StartScanForm />
          <p className="mt-3 text-xs text-slate-500">
            The free scan only reads what any visitor&apos;s browser sees. The deep scan and stress test need a one-click
            approval from the site owner, so we never actively test anyone&apos;s site without permission.
          </p>
        </Card>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CHECKS.map(([icon, title, desc]) => (
          <Card key={title}>
            <div className="text-2xl">{icon}</div>
            <h3 className="mt-2 font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{desc}</p>
          </Card>
        ))}
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {[
          ["1", "Scan free", "Enter your site. Results in under a minute, no sign-up."],
          ["2", "See your score", "Every issue ranked by risk, with one full fix free."],
          ["3", "Go deeper & fix", "One-click approve a deep scan + stress test, unlock the full report, and let us fix it."],
        ].map(([n, title, desc]) => (
          <div key={n} className="flex gap-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-600 font-bold text-white">{n}</span>
            <div>
              <h4 className="font-semibold">{title}</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400">{desc}</p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
