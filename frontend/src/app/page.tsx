import Link from "next/link";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BellRing,
  CircleCheck,
  LineChart,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

import { Logo, Wordmark } from "@/components/brand";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";

const GITHUB_URL = "https://github.com/btwitssparth/Tracestack";

const capabilities: {
  icon: LucideIcon;
  number: string;
  title: string;
  description: string;
}[] = [
  {
    icon: Activity,
    number: "01",
    title: "Uptime monitoring",
    description:
      "Keep an eye on the endpoints that matter. TraceStack checks your services on a schedule and records every result.",
  },
  {
    icon: ShieldCheck,
    number: "02",
    title: "Incident detection",
    description:
      "Spot consecutive failures, follow active incidents, and see the moment a service recovers.",
  },
  {
    icon: LineChart,
    number: "03",
    title: "Performance analytics",
    description:
      "Explore response times, recent check history, and uptime trends in one focused workspace.",
  },
  {
    icon: BellRing,
    number: "04",
    title: "Notifications",
    description:
      "Keep operational changes visible with in-app notifications and configurable browser push support.",
  },
];

const steps = [
  {
    number: "01",
    title: "Add your endpoint",
    body: "Choose a URL and configure the interval, expected status, and timeout.",
  },
  {
    number: "02",
    title: "Watch checks run",
    body: "Review recorded outcomes, HTTP status codes, and response times as they arrive.",
  },
  {
    number: "03",
    title: "Investigate and improve",
    body: "Use incident history and analytics to understand what changed and why.",
  },
];

const previewTiles = [
  { label: "Monitors", value: "All services", note: "One workspace" },
  { label: "Checks", value: "Full history", note: "Every recorded result" },
  { label: "Incidents", value: "Tracked", note: "Failure and recovery" },
];

/* Illustrative shape only — no values are shown or implied as live data. */
const previewBars = [
  34, 52, 43, 66, 48, 75, 58, 82, 61, 72, 51, 68, 88, 60, 77, 56, 70, 48, 63,
  80, 57, 74, 65, 90,
];

export default function Home() {
  return (
    <main className="min-h-screen bg-canvas text-ink">
      <header className="sticky top-0 z-30 border-b border-line bg-canvas">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3.5 lg:px-10">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo className="h-8 w-8" />
            <Wordmark className="text-[16px]" />
          </Link>

          <nav
            className="hidden items-center gap-0.5 text-[13px] font-medium text-muted md:flex"
            aria-label="Primary"
          >
            <a
              href="#features"
              className="rounded-md px-3 py-2 transition-colors hover:bg-ink/[0.05] hover:text-ink"
            >
              Features
            </a>
            <a
              href="#workflow"
              className="rounded-md px-3 py-2 transition-colors hover:bg-ink/[0.05] hover:text-ink"
            >
              How it works
            </a>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 transition-colors hover:bg-ink/[0.05] hover:text-ink"
            >
              GitHub
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <ButtonLink
              href="/login"
              variant="ghost"
              size="md"
              className="hidden sm:inline-flex"
            >
              Sign in
            </ButtonLink>
            <ButtonLink href="/login" variant="primary" size="md">
              Get started
            </ButtonLink>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl items-center gap-14 px-6 pb-20 pt-14 lg:grid-cols-[1.02fr_.98fr] lg:px-10 lg:pb-28 lg:pt-20">
        <div className="animate-rise">
          <Badge tone="accent" dot className="mb-6">
            Website and API monitoring
          </Badge>

          <h1 className="max-w-2xl text-4xl font-semibold leading-[1.06] tracking-[-0.045em] sm:text-5xl lg:text-[3.4rem]">
            Know when your services go down.
            <span className="text-faint"> Before your users tell you.</span>
          </h1>

          <p className="mt-6 max-w-xl text-[15px] leading-7 text-muted sm:text-base sm:leading-8">
            Monitor uptime, follow incidents, and understand response-time trends
            from one calm, focused workspace built for engineering teams.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <ButtonLink href="/login" variant="primary" size="lg">
              Start monitoring
              <ArrowRight className="h-4 w-4" />
            </ButtonLink>
            <ButtonLink href="#features" variant="secondary" size="lg">
              Explore features
            </ButtonLink>
          </div>

          <p className="mt-5 flex items-center gap-2 text-[12.5px] text-faint">
            <CircleCheck className="h-3.5 w-3.5 text-ok" />
            Simple setup. Clear signals. Less guesswork.
          </p>
        </div>

        <div className="animate-rise stagger-2">
          {/* Honest, clearly-labelled interface preview — structure only. */}
          <div className="overflow-hidden rounded-lg border border-line bg-nav">
            <div className="flex items-center justify-between gap-3 border-b border-line bg-raised px-4 py-3">
              <div className="flex items-center gap-2.5">
                <Logo className="h-7 w-7" />
                <span className="text-[13px] font-medium text-ink">
                  TraceStack console
                </span>
              </div>
              <Badge tone="neutral">Illustrative preview</Badge>
            </div>

            <div className="space-y-3 p-4">
              <div className="grid grid-cols-3 gap-3">
                {previewTiles.map((tile) => (
                  <div
                    key={tile.label}
                    className="rounded-md border border-line bg-panel p-3.5"
                  >
                    <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-faint">
                      {tile.label}
                    </p>
                    <p className="mt-2 text-[13px] font-medium text-ink">
                      {tile.value}
                    </p>
                    <p className="mt-0.5 text-[11px] text-faint">{tile.note}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-md border border-line bg-panel p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-medium text-ink">
                      Response time
                    </p>
                    <p className="mt-0.5 text-[11px] text-faint">
                      Recent checks across your fleet
                    </p>
                  </div>
                  <Badge tone="accent">Trend</Badge>
                </div>

                <div
                  className="mt-4 flex h-24 items-end gap-1.5"
                  role="img"
                  aria-label="Illustrative response-time trend, not live data"
                >
                  {previewBars.map((height, index) => (
                    <span
                      key={index}
                      className={
                        index === previewBars.length - 1
                          ? "flex-1 rounded-t-[3px] bg-accent"
                          : "flex-1 rounded-t-[3px] bg-accent-2/40"
                      }
                      style={{ height: `${height}%` }}
                    />
                  ))}
                </div>

                <div className="mt-3 flex items-center justify-between text-[10.5px] text-faint">
                  <span>Earlier</span>
                  <span>Latest</span>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-md border border-line bg-panel px-4 py-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-md border border-accent/25 bg-accent/10 text-accent">
                  <CircleCheck className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[12.5px] font-medium text-ink">
                    Built for visibility
                  </p>
                  <p className="mt-0.5 text-[11px] text-faint">
                    A layout preview — not live service data.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="border-y border-line bg-nav scroll-mt-16">
        <div className="mx-auto max-w-7xl px-6 py-18 lg:px-10 lg:py-24">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
              One clear view
            </p>
            <h2 className="mt-3.5 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
              The signals you need. Without the noise.
            </h2>
            <p className="mt-3.5 leading-7 text-muted">
              From a failed check to a recovered service, keep the important
              details close at hand.
            </p>
          </div>

          <div className="mt-11 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {capabilities.map((capability) => {
              const Icon = capability.icon;
              return (
                <article
                  key={capability.number}
                  className="group bg-nav p-6 transition-colors hover:bg-panel sm:p-7"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex h-9 w-9 items-center justify-center rounded-md border border-line-strong bg-panel text-accent transition-colors group-hover:border-accent/30">
                      <Icon className="h-4 w-4" strokeWidth={2.1} />
                    </span>
                    <span className="tnum text-[11px] font-semibold text-faint">
                      {capability.number}
                    </span>
                  </div>
                  <h3 className="mt-6 text-[15px] font-semibold tracking-[-0.01em]">
                    {capability.title}
                  </h3>
                  <p className="mt-2.5 text-[13px] leading-6 text-muted">
                    {capability.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section
        id="workflow"
        className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-2 lg:items-center lg:px-10 lg:py-24 scroll-mt-16"
      >
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-2">
            A simpler workflow
          </p>
          <h2 className="mt-3.5 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
            From endpoint to insight in a few steps.
          </h2>
          <p className="mt-3.5 max-w-lg leading-7 text-muted">
            TraceStack brings monitoring results and incident context together so
            you can spend less time piecing together what happened.
          </p>
        </div>

        <div className="space-y-3">
          {steps.map((step) => (
            <div
              key={step.number}
              className="flex gap-5 rounded-md border border-line bg-panel p-5 transition-colors hover:border-line-strong"
            >
              <span className="tnum pt-0.5 text-[12px] font-semibold text-accent">
                {step.number}
              </span>
              <div>
                <h3 className="text-[14px] font-semibold">{step.title}</h3>
                <p className="mt-1 text-[13px] leading-6 text-muted">
                  {step.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 pb-8 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 overflow-hidden rounded-lg border border-line bg-panel px-6 py-12 sm:flex-row sm:items-center sm:px-10 lg:px-14">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
              Make the next outage less surprising
            </p>
            <h2 className="mt-3.5 max-w-xl text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
              Your services deserve a clearer signal.
            </h2>
          </div>
          <ButtonLink
            href="/login"
            variant="primary"
            size="lg"
            className="shrink-0"
          >
            Get started
            <ArrowRight className="h-4 w-4" />
          </ButtonLink>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-8 text-[12.5px] text-faint sm:flex-row sm:items-center sm:justify-between lg:px-10">
          <div className="flex items-center gap-2.5">
            <Logo className="h-7 w-7" />
            <Wordmark />
          </div>
          <p>Website and API monitoring, made easier to understand.</p>
          <div className="flex items-center gap-5">
            <Link href="/login" className="transition-colors hover:text-ink">
              Sign in
            </Link>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 transition-colors hover:text-ink"
            >
              GitHub
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
