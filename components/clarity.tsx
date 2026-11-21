"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { isPrivatePath } from "@/lib/analytics";

declare global {
  interface Window {
    clarity?: ((...args: unknown[]) => void) & { q?: unknown[] };
  }
}

/**
 * Microsoft Clarity, loaded only when a visit starts on a public page. If the visitor then moves
 * (client-side) onto a private page, the whole page is masked so nothing sensitive is recorded.
 */
export function Clarity({ projectId }: { projectId: string }) {
  const pathname = usePathname();

  useEffect(() => {
    const isPrivate = isPrivatePath(pathname);
    if (isPrivate) document.body.setAttribute("data-clarity-mask", "True");
    else document.body.removeAttribute("data-clarity-mask");

    if (isPrivate || document.getElementById("ms-clarity")) return;
    // Official loader snippet (queues calls until the tag script arrives).
    window.clarity =
      window.clarity ||
      Object.assign((...args: unknown[]) => {
        (window.clarity!.q = window.clarity!.q || []).push(args);
      }, {});
    const s = document.createElement("script");
    s.id = "ms-clarity";
    s.async = true;
    s.src = `https://www.clarity.ms/tag/${projectId}`;
    document.head.appendChild(s);
  }, [pathname, projectId]);

  return null;
}

/** Fire a Clarity custom event if Clarity is loaded (no-op otherwise). */
export function clarityEvent(name: string) {
  try {
    window.clarity?.("event", name);
  } catch {}
}
