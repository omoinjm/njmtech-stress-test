"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { btnCls } from "./ui";

export function StartScanPanel({ domainId }: { domainId: string }) {
  const router = useRouter();
  const [accept, setAccept] = useState(false);
  const [load, setLoad] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setPending(true);
    setError(null);
    const res = await fetch("/api/scans", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ domainId, includeLoadTest: load, acceptTerms: accept }),
    });
    const data = (await res.json()) as { id?: string; error?: string };
    if (!res.ok) {
      setError(data.error ?? "Could not start the scan.");
      setPending(false);
      return;
    }
    router.push(`/scans/${data.id}`);
  }

  return (
    <div className="grid gap-3">
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" checked={load} onChange={(e) => setLoad(e.target.checked)} className="mt-1" />
        <span>
          <strong>Include stress test</strong>: up to 50 simultaneous visitors for 30 seconds. Stops automatically if your
          site starts failing. Limited to once per day.
        </span>
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} className="mt-1" />
        <span>
          I confirm I own this website or am authorised by its owner to test it, and I accept the{" "}
          <a href="/terms" className="underline" target="_blank">terms</a>.
        </span>
      </label>
      <div>
        <button onClick={start} disabled={!accept || pending} className={btnCls}>
          {pending ? "Starting…" : "Start security scan"}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
