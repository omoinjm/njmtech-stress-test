"use client";

import { useActionState } from "react";
import { addDomainAction, loginAction, startScanAction, verifyDomainAction, type FormState } from "@/app/actions";
import { btnCls, inputCls } from "./ui";

function ErrorText({ state }: { state: FormState }) {
  return state?.error ? <p className="mt-2 text-sm text-red-600">{state.error}</p> : null;
}

export function StartScanForm() {
  const [state, action, pending] = useActionState(startScanAction, undefined);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
      <input name="site" required placeholder="yourshop.co.za" className={inputCls} aria-label="Website" />
      <input name="email" type="email" required placeholder="you@yourshop.co.za" className={inputCls} aria-label="Email" />
      <button className={btnCls} disabled={pending}>{pending ? "Sending…" : "Scan my site"}</button>
      <div className="sm:col-span-3"><ErrorText state={state} /></div>
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
