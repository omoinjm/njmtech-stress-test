import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { VerifyButton } from "@/components/forms";
import { StartScanPanel } from "@/components/start-scan";
import { Card } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getDb, t } from "@/lib/db";
import { isVerified, VERIFY_FILE_PATH, VERIFY_TXT_PREFIX } from "@/lib/domains";

const code = "block overflow-x-auto rounded bg-black/5 px-3 py-2 font-mono text-xs dark:bg-white/10";

async function Inner({ params }: { params: PageProps<"/domains/[id]">["params"] }) {
  const db = await getDb();
  const { id } = await params;
  const user = await requireUser(`/domains/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const d = await db.query.domains.findFirst({ where: and(eq(t.domains.id, id), eq(t.domains.userId, user.id)) });
  if (!d) notFound();
  const value = `njmtech-verify=${d.verifyToken}`;

  if (isVerified(d)) {
    return (
      <Card>
        <p className="mb-4 text-sm text-emerald-600">✓ Ownership verified via {d.verifyMethod === "dns" ? "DNS" : "file"}.</p>
        <StartScanPanel domainId={d.id} />
      </Card>
    );
  }

  return (
    <Card className="grid gap-5">
      <div>
        <h2 className="font-semibold">Prove you own this website</h2>
        <p className="text-sm text-slate-500">
          This keeps the tool from being used against other people&apos;s sites. Choose <strong>one</strong> option:
        </p>
      </div>
      <div className="grid gap-2">
        <h3 className="text-sm font-semibold">Option A: DNS TXT record (recommended)</h3>
        <p className="text-sm">In your domain&apos;s DNS settings, add a TXT record:</p>
        <div className="grid gap-1 text-sm sm:grid-cols-[80px_1fr]">
          <span className="text-slate-500">Name</span><code className={code}>{VERIFY_TXT_PREFIX}.{d.hostname}</code>
          <span className="text-slate-500">Value</span><code className={code}>{value}</code>
        </div>
      </div>
      <div className="grid gap-2">
        <h3 className="text-sm font-semibold">Option B: Upload a file</h3>
        <p className="text-sm">Create a text file containing exactly the value above, reachable at:</p>
        <code className={code}>{d.origin}{VERIFY_FILE_PATH}</code>
      </div>
      <VerifyButton domainId={d.id} />
    </Card>
  );
}

export default function DomainPage(props: PageProps<"/domains/[id]">) {
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">Set up your scan</h1>
      <Suspense fallback={<p className="text-slate-500">Loading…</p>}>
        <Inner params={props.params} />
      </Suspense>
    </>
  );
}
