import { Sparkle } from "lucide-react";

/**
 * TraceStack brand marker. A compact, engineered glyph that stays legible
 * at small sizes in the sidebar, headers, and auth screens.
 */
export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <span
      className={`relative inline-flex items-center justify-center rounded-md border border-accent/25 bg-accent/10 text-accent ${className}`}
      aria-hidden="true"
    >
      <Sparkle className="h-[58%] w-[58%]" strokeWidth={2.4} />
    </span>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`text-[15px] font-semibold tracking-[-0.01em] text-ink ${className}`}>
      Trace<span className="text-accent">Stack</span>
    </span>
  );
}
