import { Suspense } from "react";
import { LoginForm } from "@/components/forms";
import { Card } from "@/components/ui";

async function Inner({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" && sp.next.startsWith("/") ? sp.next : "/dashboard";
  return (
    <>
      {sp.error === "expired" && <p className="mb-3 text-sm text-red-600">That link has expired or was already used.</p>}
      <LoginForm next={next} />
    </>
  );
}

export default function LoginPage(props: PageProps<"/login">) {
  return (
    <Card className="mx-auto max-w-md">
      <h1 className="mb-1 text-xl font-semibold">Sign in</h1>
      <p className="mb-4 text-sm text-slate-500">No password needed. We&apos;ll email you a link.</p>
      <Suspense>
        <Inner searchParams={props.searchParams} />
      </Suspense>
    </Card>
  );
}
