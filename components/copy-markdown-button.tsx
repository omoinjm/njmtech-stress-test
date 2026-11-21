"use client";

import { useState } from "react";
import { btnGhostCls } from "./ui";

/** Copies the report as Markdown (Clipboard API, with a fallback for non-secure contexts). */
export function CopyMarkdownButton({ markdown }: { markdown: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(markdown);
      } else {
        const ta = document.createElement("textarea");
        ta.value = markdown;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        ta.remove();
        if (!ok) throw new Error("copy failed");
      }
      setState("copied");
    } catch {
      setState("failed");
    }
    setTimeout(() => setState("idle"), 2000);
  }

  return (
    <button onClick={copy} className={`no-print ${btnGhostCls}`} aria-live="polite">
      {state === "copied" ? "✓ Copied" : state === "failed" ? "Copy failed" : "Copy Markdown"}
    </button>
  );
}
