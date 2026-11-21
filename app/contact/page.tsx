import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/components/forms";
import { Card } from "@/components/ui";

export const metadata: Metadata = {
  title: "Contact | NJM Tech Security",
  description: "Get in touch with the NJM Tech Security team about a scan, a report, a fix quote, or anything else about your website's security.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Contact us</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Questions about a scan, your report, a fix quote, or partnering with us? Send a message and a person will reply,
          usually within one business day.
        </p>
      </header>
      <Card>
        <ContactForm />
      </Card>
      <Card className="text-sm text-slate-600 dark:text-slate-300">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100">Before you write</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Want to know how your site is doing? <Link href="/" className="text-emerald-600 underline">Run the free scan</Link>; it takes under a minute.</li>
          <li>Already have a report? Use <strong>Request a fix quote</strong> on the report itself so we can see your results.</li>
          <li>Think your site is being attacked right now? Contact your web host first; they can block traffic at the server immediately.</li>
        </ul>
      </Card>
    </div>
  );
}
