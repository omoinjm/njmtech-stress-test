"use client";

import { btnGhostCls } from "./ui";

/** "Save as PDF" via the browser print dialog; print CSS hides navigation. */
export function PrintButton() {
  return (
    <button onClick={() => window.print()} className={`no-print ${btnGhostCls}`}>
      Export PDF
    </button>
  );
}
