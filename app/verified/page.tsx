import Link from "next/link";
import { Suspense } from "react";
import { Card } from "@/components/ui";

async function Inner({ searchParams }: { searchParams: PageProps<"/verified">["searchParams"] }) {
  const sp = await searchParams;
  if (sp.error) {
    return (
      <>
        <div className="text-4xl">⚠️</div>
        <h1 className="mt-2 text-xl font-semibold">This approval link has expired or was already used</h1>
        <p className="mt-2 text-sm text-slate-500">Ask the person who requested the scan to send a new one.</p>
      </>
    );
  }
  return (
    <>
      <div className="text-4xl">✅</div>
      <h1 className="mt-2 text-xl font-semibold">{String(sp.site ?? "Your site")} is verified</h1>
      <p className="mt-2 text-sm text-slate-500">The deep scan and stress test are now unlocked for this website.</p>
      <Link href={`/domains/${sp.domain}`} className="mt-4 inline-block rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
        Continue to the deep scan
      </Link>
    </>
  );
}

export default function VerifiedPage(props: PageProps<"/verified">) {
  return (
    <Card className="mx-auto max-w-md text-center">
      <Suspense>
        <Inner searchParams={props.searchParams} />
      </Suspense>
    </Card>
  );
}
