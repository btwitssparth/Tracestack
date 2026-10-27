import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type Tone = "ok" | "warn" | "crit" | "info" | "neutral" | "accent";

const tones: Record<Tone, { chip: string; dot: string }> = {
  ok: { chip: "border-ok/25 bg-ok/[0.12] text-ok", dot: "bg-ok" },
  warn: { chip: "border-warn/25 bg-warn/[0.12] text-warn", dot: "bg-warn" },
  crit: { chip: "border-crit/30 bg-crit/[0.13] text-crit", dot: "bg-crit" },
  info: { chip: "border-info/25 bg-info/[0.12] text-info", dot: "bg-info" },
  neutral: { chip: "border-line-strong bg-ink/[0.05] text-muted", dot: "bg-faint" },
  accent: { chip: "border-accent/25 bg-accent/[0.1] text-accent", dot: "bg-accent" },
};

export function Badge({
  tone = "neutral",
  dot = false,
  pulse = false,
  className,
  children,
}: {
  tone?: Tone;
  dot?: boolean;
  pulse?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const style = tones[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[6px] border px-2 py-[3px] text-[11px] font-medium leading-none",
        style.chip,
        className,
      )}
    >
      {dot && (
        <span
          className={cn("h-1.5 w-1.5 rounded-full", style.dot, pulse && "animate-live")}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}
