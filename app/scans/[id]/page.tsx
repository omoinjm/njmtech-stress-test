import { notFound, redirect } from "next/navigation";
import { ScanReport } from "@/components/scan-report";
import { getUser } from "@/lib/auth";
import { getScanView } from "@/lib/reports";

/** Viewable by the signed-in owner, or by anyone holding the scan's access link (?t=…). */
export default async function ScanPage({ params, searchParams }: PageProps<"/scans/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const token = typeof sp.t === "string" ? sp.t : null;
  const user = await getUser();
  const view = await getScanView(id, { userId: user?.id, token });
  if (!view) {
    if (!user) redirect(`/login?next=${encodeURIComponent(`/scans/${id}`)}`);
    notFound();
  }
  return <ScanReport initial={view} paymentNotice={typeof sp.payment === "string" ? sp.payment : undefined} />;
}
