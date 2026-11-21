import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ScanReport } from "@/components/scan-report";
import { requireUser } from "@/lib/auth";
import { getScanViewForUser } from "@/lib/reports";

async function Inner({ params, searchParams }: PageProps<"/scans/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser(`/scans/${id}`);
  const view = await getScanViewForUser(id, user.id);
  if (!view) notFound();
  return <ScanReport initial={view} paymentNotice={typeof sp.payment === "string" ? sp.payment : undefined} />;
}

export default function ScanPage(props: PageProps<"/scans/[id]">) {
  return (
    <Suspense fallback={<p className="text-slate-500">Loading report…</p>}>
      <Inner {...props} />
    </Suspense>
  );
}
