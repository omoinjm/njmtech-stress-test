import { StartScanForm } from "@/components/forms";
import { Card } from "@/components/ui";

const CHECKS = [
  ["🔒", "HTTPS & certificates", "Expired or weak certificates, missing redirects, outdated TLS."],
  ["🧱", "Security headers", "Protection against clickjacking, script injection and card skimming."],
  ["📂", "Exposed files", "Leaked .env passwords, Git repositories, database backups."],
  ["🛒", "CMS & plugins", "WordPress user leaks, XML-RPC abuse, vulnerable libraries."],
  ["✉️", "Email spoofing", "Can scammers send fake invoices from your domain?"],
  ["⚡", "Stress test", "How your site holds up when traffic spikes."],
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
          A free security and stress check in about two minutes. See what attackers see, get one fix for free, and
          let our team handle the rest.
        </p>
        <Card className="mx-auto w-full max-w-3xl text-left">
          <StartScanForm />
          <p className="mt-3 text-xs text-slate-500">
            We&apos;ll email you a sign-in link, then ask you to prove you own the site (a 1-minute DNS or file step). We
            never scan sites without the owner&apos;s permission.
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
          ["1", "Scan", "Verify you own the site and run the scan."],
          ["2", "See your score", "Every issue ranked by risk, with one full fix free."],
          ["3", "Get it fixed", "Unlock the full report and our team fixes everything for you."],
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
