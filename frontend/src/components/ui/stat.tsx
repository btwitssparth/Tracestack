import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { Tone } from "./badge";

const accentBar: Record<Tone, string> = {
  ok: "bg-ok",
  warn: "bg-warn",
  crit: "bg-crit",
  info: "bg-info",
  neutral: "bg-line-strong",
  accent: "bg-accent",
};

/**
 * Compact metric tile. Value is tabular so columns of numbers stay aligned.
 */
export function Stat({
  label,
  value,
  unit,
  note,
  icon,
  tone = "neutral",
  loading = false,
  className,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  note?: ReactNode;
  icon?: ReactNode;
  tone?: Tone;
  loading?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg border border-line bg-panel p-4",
        className,
      )}
    >
      <span className={cn("absolute inset-x-0 top-0 h-px opacity-50", accentBar[tone])} aria-hidden="true" />
      <div className="flex items-start justify-between gap-3">
        <p className="text-[12px] font-medium uppercase tracking-[0.1em] text-faint">{label}</p>
        {icon && <span className="text-faint transition-colors group-hover:text-muted">{icon}</span>}
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span
          className={cn(
            "tnum text-[26px] font-semibold leading-none tracking-[-0.02em]",
            tone === "ok" && "text-ok",
            tone === "crit" && "text-crit",
            tone === "warn" && "text-warn",
            tone === "info" && "text-info",
            (tone === "neutral" || tone === "accent") && "text-ink",
          )}
        >
          {loading ? <span className="inline-block h-6 w-10 translate-y-1 rounded skeleton" /> : value}
        </span>
        {unit && !loading && <span className="text-[13px] text-faint">{unit}</span>}
      </div>
      {note && <p className="mt-2 text-[12px] leading-5 text-faint">{note}</p>}
    </div>
  );
}
