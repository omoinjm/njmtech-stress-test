import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EmailVerifyForm, VerifyButton } from "@/components/forms";
import { StartScanPanel } from "@/components/start-scan";
import { Card } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getDb, t } from "@/lib/db";
import { isVerified, verificationEmailOptions, VERIFY_FILE_PATH, VERIFY_TXT_PREFIX } from "@/lib/domains";

const code = "block overflow-x-auto rounded bg-black/5 px-3 py-2 font-mono text-xs dark:bg-white/10";
const METHOD: Record<string, string> = { dns: "DNS record", file: "verification file", email: "admin email approval" };

async function Inner({ params }: { params: PageProps<"/domains/[id]">["params"] }) {
  const { id } = await params;
  const user = await requireUser(`/domains/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = await getDb();
  const d = await db.query.domains.findFirst({ where: and(eq(t.domains.id, id), eq(t.domains.userId, user.id)) });
  if (!d) notFound();
  const value = `njmtech-verify=${d.verifyToken}`;

  if (isVerified(d)) {
    return (
      <Card>
        <p className="mb-4 text-sm text-emerald-600">✓ Ownership of {d.hostname} verified via {METHOD[d.verifyMethod ?? "dns"]}.</p>
        <StartScanPanel domainId={d.id} />
      </Card>
    );
  }

  const emails = verificationEmailOptions(d.hostname);
  return (
    <Card className="grid gap-6">
      <div>
        <h2 className="font-semibold">Approve the deep scan of {d.hostname}</h2>
        <p className="text-sm text-slate-500">
          The deep scan actively tests your site, so the domain owner has to approve it once. It&apos;s valid for 30 days.
        </p>
      </div>

      {emails.length > 0 && (
        <div className="grid gap-2 rounded-lg border border-emerald-600/40 p-4">
          <h3 className="text-sm font-semibold">One click: approve by email (recommended)</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            We&apos;ll send an approval link to one of your domain&apos;s standard admin mailboxes. Whoever receives it just
            clicks the link. Nothing to configure.
          </p>
          <EmailVerifyForm domainId={d.id} options={emails} />
        </div>
      )}

      <details className="group">
        <summary className="cursor-pointer text-sm font-semibold text-slate-600 dark:text-slate-300">
          No access to those mailboxes? Verify with DNS or a file instead
        </summary>
        <div className="mt-4 grid gap-5">
          <div className="grid gap-2">
            <h3 className="text-sm font-semibold">DNS TXT record</h3>
            <div className="grid gap-1 text-sm sm:grid-cols-[80px_1fr]">
              <span className="text-slate-500">Name</span><code className={code}>{VERIFY_TXT_PREFIX}.{d.hostname}</code>
              <span className="text-slate-500">Value</span><code className={code}>{value}</code>
            </div>
          </div>
          <div className="grid gap-2">
            <h3 className="text-sm font-semibold">Or upload a file</h3>
            <p className="text-sm">A text file containing exactly the value above, reachable at:</p>
            <code className={code}>{d.origin}{VERIFY_FILE_PATH}</code>
          </div>
          <VerifyButton domainId={d.id} />
        </div>
      </details>
    </Card>
  );
}

export default function DomainPage(props: PageProps<"/domains/[id]">) {
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">Deep scan + stress test</h1>
      <Suspense fallback={<p className="text-slate-500">Loading…</p>}>
        <Inner params={props.params} />
      </Suspense>
    </>
  );
}
