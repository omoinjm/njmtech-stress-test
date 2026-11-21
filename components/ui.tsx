import type { Severity } from "@/lib/scanner/types";

const SEV_STYLES: Record<Severity, string> = {
  critical: "bg-red-600 text-white",
  high: "bg-orange-500 text-white",
  medium: "bg-amber-400 text-black",
  low: "bg-sky-500 text-white",
  info: "bg-slate-400 text-white",
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${SEV_STYLES[severity]}`}>
      {severity}
    </span>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-black/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5 ${className}`}>
      {children}
    </div>
  );
}

export const inputCls =
  "w-full rounded-md border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 dark:border-white/15 dark:bg-black/30";
export const btnCls =
  "inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50";
export const btnGhostCls =
  "inline-flex items-center justify-center rounded-md border border-black/15 px-4 py-2 text-sm font-medium hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10";

export function ScoreRing({ score }: { score: number }) {
  const color = score >= 80 ? "#059669" : score >= 50 ? "#d97706" : "#dc2626";
  const deg = (score / 100) * 360;
  return (
    <div
      className="grid h-24 w-24 place-items-center rounded-full"
      style={{ background: `conic-gradient(${color} ${deg}deg, rgba(127,127,127,.2) 0)` }}
      aria-label={`Security score ${score} out of 100`}
    >
      <div className="grid h-[76px] w-[76px] place-items-center rounded-full bg-[var(--background)]">
        <span className="text-2xl font-bold" style={{ color }}>{score}</span>
      </div>
    </div>
  );
}
