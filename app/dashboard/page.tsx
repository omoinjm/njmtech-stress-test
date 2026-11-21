import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import { AddDomainForm } from "@/components/forms";
import { Card } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getDb, t } from "@/lib/db";
import { isVerified } from "@/lib/domains";

async function Inner({ searchParams }: { searchParams: PageProps<"/dashboard">["searchParams"] }) {
  const db = await getDb();
  const user = await requireUser();
  const sp = await searchParams;
  const domains = await db.query.domains.findMany({ where: eq(t.domains.userId, user.id), orderBy: desc(t.domains.createdAt) });
  const scans = await db.query.scans.findMany({ where: eq(t.scans.userId, user.id), orderBy: desc(t.scans.createdAt), limit: 20 });

  return (
    <div className="grid gap-6">
      {typeof sp.error === "string" && <p className="text-sm text-red-600">{sp.error}</p>}
      <Card>
        <h2 className="mb-3 font-semibold">Your websites</h2>
        <ul className="mb-4 divide-y divide-black/5 dark:divide-white/10">
          {domains.map((d) => (
            <li key={d.id} className="flex items-center justify-between py-2 text-sm">
              <span className="font-mono">{d.origin}</span>
              <span className="flex items-center gap-3">
                {isVerified(d) ? (
                  <span className="text-emerald-600">✓ Verified</span>
                ) : (
                  <span className="text-amber-600">Not verified</span>
                )}
                <Link href={`/domains/${d.id}`} className="underline">{isVerified(d) ? "Scan" : "Verify"}</Link>
              </span>
            </li>
          ))}
          {domains.length === 0 && <li className="py-2 text-sm text-slate-500">No websites yet.</li>}
        </ul>
        <AddDomainForm />
      </Card>
      <Card>
        <h2 className="mb-3 font-semibold">Recent scans</h2>
        <ul className="divide-y divide-black/5 dark:divide-white/10">
          {scans.map((s) => (
            <li key={s.id} className="flex items-center justify-between py-2 text-sm">
              <span>
                <span className="font-mono">{s.origin}</span>{" "}
                <span className="text-slate-500">· {s.createdAt.toLocaleString("en-ZA")}</span>
              </span>
              <Link href={`/scans/${s.id}`} className="underline">{s.status === "done" ? "View report" : s.status}</Link>
            </li>
          ))}
          {scans.length === 0 && <li className="py-2 text-sm text-slate-500">No scans yet.</li>}
        </ul>
      </Card>
    </div>
  );
}

export default function Dashboard(props: PageProps<"/dashboard">) {
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">Dashboard</h1>
      <Suspense fallback={<p className="text-slate-500">Loading…</p>}>
        <Inner searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
