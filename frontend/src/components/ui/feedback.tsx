import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-md", className)} aria-hidden="true" />;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-12 text-center", className)}>
      {icon && (
        <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg border border-line-strong bg-raised text-muted">
          {icon}
        </span>
      )}
      <p className="text-sm font-medium text-ink">{title}</p>
      {description && <p className="mt-1.5 max-w-sm text-[13px] leading-5 text-faint">{description}</p>}
      {action && <div className="mt-5 flex flex-wrap items-center justify-center gap-2">{action}</div>}
    </div>
  );
}

export function InlineAlert({
  tone = "crit",
  icon,
  children,
  action,
  className,
}: {
  tone?: "crit" | "warn" | "ok" | "info";
  icon?: ReactNode;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const tones = {
    crit: "border-crit/25 bg-crit/[0.07] text-crit",
    warn: "border-warn/25 bg-warn/[0.07] text-warn",
    ok: "border-ok/25 bg-ok/[0.07] text-ok",
    info: "border-info/25 bg-info/[0.07] text-info",
  } as const;

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-md border px-3.5 py-3 text-[13px] leading-5",
        tones[tone],
        className,
      )}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span className="min-w-0 flex-1">{children}</span>
      {action && <span className="shrink-0">{action}</span>}
    </div>
  );
}
