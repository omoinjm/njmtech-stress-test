"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import {
  addDomainAction,
  loginAction,
  scanSignInAction,
  sendVerificationEmailAction,
  verifyDomainAction,
  type FormState,
} from "@/app/actions";
import { btnCls, inputCls } from "./ui";

function ErrorText({ state }: { state: FormState }) {
  return state?.error ? <p className="mt-2 text-sm text-red-600">{state.error}</p> : null;
}

/** Landing page: starts an instant public (passive) scan; no sign-in or verification. */
export function StartScanForm({ source, compact }: { source?: string; compact?: boolean } = {}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    const res = await fetch("/api/scans/public", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        site: fd.get("site"),
        email: fd.get("email"),
        // Explicit source (e.g. a blog CTA) wins; otherwise keep a ?src= from the landing URL.
        source: source ?? new URLSearchParams(window.location.search).get("src") ?? undefined,
      }),
    });
    const data = (await res.json()) as { url?: string; error?: string };
    if (res.ok && data.url) return router.push(data.url);
    setError(data.error ?? "Could not start the scan.");
    setPending(false);
  }
  return (
    <form onSubmit={onSubmit} className={`grid gap-3 ${compact ? "md:grid-cols-[1fr_1fr_auto]" : "sm:grid-cols-[1fr_1fr_auto]"}`}>
      <input name="site" required placeholder="yourshop.co.za" className={inputCls} aria-label="Website" />
      <input name="email" type="email" required placeholder="you@yourshop.co.za" className={inputCls} aria-label="Email" />
      <button className={btnCls} disabled={pending}>{pending ? "Starting…" : "Scan my site free"}</button>
      {error && <p className="text-sm text-red-600 sm:col-span-3">{error}</p>}
    </form>
  );
}

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(loginAction, undefined);
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="next" value={next} />
      <input name="email" type="email" required placeholder="you@company.com" className={inputCls} />
      <button className={btnCls} disabled={pending}>{pending ? "Sending…" : "Email me a sign-in link"}</button>
      <ErrorText state={state} />
    </form>
  );
}

export function AddDomainForm() {
  const [state, action, pending] = useActionState(addDomainAction, undefined);
  return (
    <form action={action} className="flex flex-col gap-2 sm:flex-row">
      <input name="site" required placeholder="shop.example.com" className={inputCls} />
      <button className={btnCls} disabled={pending}>Add website</button>
      <ErrorText state={state} />
    </form>
  );
}

export function VerifyButton({ domainId }: { domainId: string }) {
  const [state, action, pending] = useActionState(verifyDomainAction, undefined);
  return (
    <form action={action}>
      <input type="hidden" name="domainId" value={domainId} />
      <button className={btnCls} disabled={pending}>{pending ? "Checking…" : "I've added it, verify now"}</button>
      <ErrorText state={state} />
    </form>
  );
}

/** One-click ownership proof: approval link emailed to a mailbox at the site's own domain. */
export function EmailVerifyForm({ domainId, domain, suggestions }: { domainId: string; domain: string; suggestions: string[] }) {
  const [state, action, pending] = useActionState(sendVerificationEmailAction, undefined);
  const [local, setLocal] = useState(suggestions[0] ?? "info");
  if (state?.ok) {
    return (
      <p className="rounded-md bg-emerald-600/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
        📬 Approval link sent to <strong>{state.sentTo}</strong>. Click it and the deep scan unlocks (refresh this page after
        approving). Nothing there in a few minutes? Check spam, or try a different mailbox.
      </p>
    );
  }
  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="domainId" value={domainId} />
      <input type="hidden" name="email" value={`${local.trim()}@${domain}`} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex flex-1 items-stretch overflow-hidden rounded-md border border-black/15 focus-within:border-emerald-600 dark:border-white/15">
          <input
            value={local}
            onChange={(e) => setLocal(e.target.value.replace(/@.*/, "").replace(/\s/g, ""))}
            aria-label="Mailbox name"
            className="min-w-0 flex-1 bg-white px-3 py-2 text-sm outline-none dark:bg-black/30"
            placeholder="info"
          />
          <span className="grid place-items-center bg-black/5 px-3 text-sm text-slate-500 dark:bg-white/10">@{domain}</span>
        </div>
        <button className={btnCls} disabled={pending || !local.trim()}>{pending ? "Sending…" : "Email the approval link"}</button>
      </div>
      <div className="flex flex-wrap items-center gap-1 text-xs text-slate-500">
        Common:
        {suggestions.map((sug) => (
          <button key={sug} type="button" onClick={() => setLocal(sug)} className="rounded border border-black/10 px-1.5 py-0.5 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10">
            {sug}@
          </button>
        ))}
      </div>
      <ErrorText state={state} />
    </form>
  );
}

/** Shown on a report opened from its link without a session: magic-link sign-in back to this report. */
export function ScanSignIn({ scanId, token, emailHint }: { scanId: string; token: string; emailHint: string }) {
  const [state, action, pending] = useActionState(scanSignInAction, undefined);
  if (state?.ok) return <p className="text-sm text-emerald-600">📬 Sign-in link sent to {emailHint}. Open it to continue.</p>;
  return (
    <form action={action}>
      <input type="hidden" name="scanId" value={scanId} />
      <input type="hidden" name="t" value={token} />
      <button className={btnCls} disabled={pending}>{pending ? "Sending…" : `Email a sign-in link to ${emailHint}`}</button>
      <ErrorText state={state} />
    </form>
  );
}
