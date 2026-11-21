import { Card } from "@/components/ui";

export default function Terms() {
  return (
    <Card className="prose prose-sm max-w-none dark:prose-invert">
      <h1 className="text-xl font-semibold">Scanning terms</h1>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">
        <li>The free public scan only reads what any visitor&apos;s browser receives: the homepage, its TLS certificate and public DNS records. It sends no probes, logins or load.</li>
        <li>The deep scan and stress test may only be run on websites you own or are explicitly authorised to test. They require approval from the domain (a one-click link sent to admin@/webmaster@/hostmaster@/postmaster@/administrator@ at the domain, or a DNS/file record), valid for 30 days.</li>
        <li>Checks are non-destructive: we read public responses and look for known misconfigurations. We do not exploit vulnerabilities, log in, submit forms, or extract data.</li>
        <li>The optional stress test sends at most 50 concurrent requests for at most 30 seconds, stops automatically if your site starts failing, and runs at most once per site per day.</li>
        <li>Every scan is logged with the requesting account and IP address.</li>
        <li>Automated results may include false positives or miss issues; they are not a substitute for a full manual penetration test.</li>
        <li>Your scan results are confidential and are only used to provide the report and, if you request it, a quote to fix the issues.</li>
      </ol>
    </Card>
  );
}
