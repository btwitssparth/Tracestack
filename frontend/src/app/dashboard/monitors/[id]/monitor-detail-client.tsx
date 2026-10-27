"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowLeft,
  CircleAlert,
  CircleCheck,
  Clock,
  ExternalLink,
  Gauge,
  RefreshCw,
  Timer,
  TriangleAlert,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge, type Tone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, InlineAlert, Skeleton } from "@/components/ui/feedback";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Stat } from "@/components/ui/stat";

type Monitor = {
  id: number;
  name: string;
  url: string;
  check_interval_seconds: number;
  expected_status_code: number;
  is_active: boolean;
  current_status: "unknown" | "up" | "down";
  last_checked_at: string | null;
  created_at: string;
};
type Check = {
  id: number;
  checked_at: string;
  success: boolean;
  status_code: number | null;
  response_time_ms: number | null;
  error_type: string | null;
  error_message: string | null;
};

type Filter = "all" | "success" | "failed";

function formatDate(value: string | null) {
  if (!value) return "Not checked yet";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not available" : date.toLocaleString();
}

function relativeTime(value: string | null) {
  if (!value) return "never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "never";
  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function formatDuration(seconds: number) {
  if (seconds >= 3600 && seconds % 3600 === 0) return `${seconds / 3600} hr${seconds === 3600 ? "" : "s"}`;
  if (seconds >= 60 && seconds % 60 === 0) return `${seconds / 60} min`;
  return `${seconds} sec`;
}

function statusMeta(monitor: Monitor): { label: string; tone: Tone; pulse?: boolean } {
  if (!monitor.is_active) return { label: "Paused", tone: "neutral" };
  if (monitor.current_status === "up") return { label: "Operational", tone: "ok" };
  if (monitor.current_status === "down") return { label: "Down", tone: "crit", pulse: true };
  return { label: "Pending", tone: "warn" };
}

function DetailSkeleton() {
  return (
    <div className="animate-fade">
      <Skeleton className="h-4 w-32" />
      <div className="mt-5 flex items-start justify-between gap-4">
        <div className="space-y-3">
          <Skeleton className="h-7 w-64 max-w-full" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <Skeleton key={item} className="h-[104px] rounded-lg" />
        ))}
      </div>
      <Skeleton className="mt-5 h-64 rounded-lg" />
    </div>
  );
}

export default function MonitorDetailClient({ monitorId }: { monitorId: string }) {
  const [monitor, setMonitor] = useState<Monitor | null>(null);
  const [checks, setChecks] = useState<Check[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError("");
      try {
        const [monitorResponse, checksResponse] = await Promise.all([
          fetch("/api/monitors", { cache: "no-store" }),
          fetch("/api/monitors/" + encodeURIComponent(monitorId) + "/checks?limit=100", {
            cache: "no-store",
          }),
        ]);
        const monitorBody = await monitorResponse.json().catch(() => ({}));
        const checksBody = await checksResponse.json().catch(() => ({}));
        if (!monitorResponse.ok) throw new Error(monitorBody.detail || "Could not load monitors.");
        if (!checksResponse.ok) throw new Error(checksBody.detail || "Could not load check history.");
        const found = (Array.isArray(monitorBody) ? monitorBody : []).find(
          (item: Monitor) => String(item.id) === monitorId,
        );
        if (!found) throw new Error("Monitor not found, or access is unavailable.");
        setMonitor(found);
        setChecks(Array.isArray(checksBody) ? checksBody : []);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not load monitor details.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [monitorId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const derived = useMemo(() => {
    const successful = checks.filter((check) => check.success).length;
    const failed = checks.length - successful;
    const timed = checks.filter((check) => check.response_time_ms !== null);
    const average = timed.length
      ? Math.round(timed.reduce((sum, check) => sum + (check.response_time_ms ?? 0), 0) / timed.length)
      : null;
    const uptime = checks.length ? (successful / checks.length) * 100 : null;
    const latestFailure = checks.find((check) => !check.success);
    const maxResponse = Math.max(1, ...timed.map((check) => check.response_time_ms ?? 0));
    const sparkline = [...checks].reverse().slice(-40);
    return { successful, failed, average, uptime, latestFailure, maxResponse, sparkline };
  }, [checks]);

  const visibleChecks = useMemo(() => {
    if (filter === "all") return checks;
    return checks.filter((check) => (filter === "success" ? check.success : !check.success));
  }, [checks, filter]);

  if (loading) return <DetailSkeleton />;

  if (error && !monitor) {
    return (
      <div className="mx-auto max-w-2xl">
        <Panel className="p-6 sm:p-8">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-crit/25 bg-crit/10 text-crit">
            <CircleAlert className="h-4 w-4" />
          </span>
          <h1 className="mt-4 text-lg font-semibold tracking-[-0.01em] text-ink">Monitor unavailable</h1>
          <p className="mt-2 text-[13px] leading-6 text-muted">{error}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => void load()}>
              Try again
            </Button>
            <Link
              href="/dashboard"
              className="inline-flex h-[38px] items-center rounded-md border border-line-strong bg-raised px-3.5 text-sm text-ink transition-colors hover:bg-alt"
            >
              Back to dashboard
            </Link>
          </div>
        </Panel>
      </div>
    );
  }

  if (!monitor) return null;

  const meta = statusMeta(monitor);

  return (
    <>
      <Link
        href="/dashboard"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-faint transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All monitors
      </Link>

      <header className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-ink sm:text-[26px]">
              {monitor.name}
            </h1>
            <Badge tone={meta.tone} dot pulse={meta.pulse}>{meta.label}</Badge>
          </div>
          <a
            href={monitor.url}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex max-w-full items-center gap-1.5 break-all font-mono text-[12px] text-muted transition-colors hover:text-accent"
          >
            {monitor.url}
            <ExternalLink className="h-3 w-3 shrink-0" />
          </a>
          <p className="tnum mt-2 text-[12px] text-faint">
            Last checked {relativeTime(monitor.last_checked_at)} · Created {formatDate(monitor.created_at)}
          </p>
        </div>
        <Button onClick={() => void load(true)} disabled={refreshing} className="shrink-0">
          <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin-slow")} />
          {refreshing ? "Refreshing" : "Refresh"}
        </Button>
      </header>

      {error && monitor && (
        <InlineAlert
          className="mt-5"
          icon={<CircleAlert className="h-4 w-4" />}
          action={
            <Button size="sm" variant="danger" onClick={() => void load(true)}>
              Try again
            </Button>
          }
        >
          {error}
        </InlineAlert>
      )}

      <section aria-label="Monitor metrics" className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Uptime"
          value={derived.uptime === null ? "—" : derived.uptime.toFixed(2)}
          unit={derived.uptime === null ? undefined : "%"}
          tone={derived.uptime !== null && derived.uptime < 99 ? "warn" : "ok"}
          icon={<Gauge className="h-4 w-4" />}
          note={checks.length ? `${derived.successful} of ${checks.length} checks` : "Awaiting first check"}
        />
        <Stat
          label="Avg response"
          value={derived.average === null ? "—" : derived.average}
          unit={derived.average === null ? undefined : "ms"}
          icon={<Clock className="h-4 w-4" />}
          note={`${checks.filter((c) => c.response_time_ms !== null).length} timed checks`}
        />
        <Stat
          label="Failed checks"
          value={derived.failed}
          tone={derived.failed ? "crit" : "neutral"}
          icon={<CircleAlert className="h-4 w-4" />}
          note={derived.failed ? "Review history below" : "None in loaded history"}
        />
        <Stat
          label="Check interval"
          value={formatDuration(monitor.check_interval_seconds)}
          icon={<Timer className="h-4 w-4" />}
          note={`Expected HTTP ${monitor.expected_status_code}`}
        />
      </section>

      {monitor.current_status === "down" && monitor.is_active && (
        <div className="mt-5 rounded-lg border border-crit/25 bg-crit/[0.06] p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-crit/25 bg-crit/10 text-crit">
              <TriangleAlert className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h2 className="text-[13px] font-semibold text-crit">This endpoint is reporting as down</h2>
              <p className="mt-1 text-[13px] leading-6 text-muted">
                {derived.latestFailure
                  ? derived.latestFailure.error_message ||
                    derived.latestFailure.error_type ||
                    "The latest recorded failure did not include additional error details."
                  : "Check the latest health-check results below for more information."}
              </p>
              {derived.latestFailure && (
                <p className="tnum mt-1.5 text-[11px] text-faint">
                  Last failure recorded {formatDate(derived.latestFailure.checked_at)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {derived.sparkline.length > 1 && (
        <Panel className="mt-5">
          <PanelHeader
            icon={<Activity className="h-4 w-4" />}
            title="Recent response time"
            description={`Latest ${derived.sparkline.length} checks · peak ${Math.round(derived.maxResponse)} ms`}
          />
          <div className="px-5 py-5">
            <div className="flex h-24 items-end gap-[3px]">
              {derived.sparkline.map((check, index) => (
                <div
                  key={check.id}
                  title={`${formatDate(check.checked_at)} · ${
                    check.response_time_ms === null ? "no timing" : `${Math.round(check.response_time_ms)} ms`
                  } · ${check.success ? "Success" : "Failure"}`}
                  aria-label={`Check ${index + 1}`}
                  className={cn(
                    "min-w-0 flex-1 rounded-t-[3px] transition-colors",
                    check.response_time_ms === null
                      ? "bg-line-strong"
                      : check.success
                        ? "bg-accent/60 hover:bg-accent"
                        : "bg-crit/75 hover:bg-crit",
                  )}
                  style={{
                    height: `${Math.max(
                      4,
                      ((check.response_time_ms ?? 0) / derived.maxResponse) * 100,
                    )}%`,
                  }}
                />
              ))}
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-faint">
              <span>oldest loaded</span>
              <span>most recent</span>
            </div>
          </div>
        </Panel>
      )}

      <Panel className="mt-5">
        <PanelHeader
          icon={<CircleCheck className="h-4 w-4" />}
          title="Health-check history"
          description="Recent results recorded for this endpoint."
          actions={
            <div className="flex items-center gap-2">
              <div className="flex rounded-md border border-line p-0.5">
                {(
                  [
                    ["all", "All"],
                    ["success", "Success"],
                    ["failed", "Failed"],
                  ] as Array<[Filter, string]>
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFilter(key)}
                    aria-pressed={filter === key}
                    className={cn(
                      "rounded-[5px] px-2.5 py-1 text-[11px] font-medium transition-colors",
                      filter === key ? "bg-accent/12 text-accent" : "text-muted hover:text-ink",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <span className="tnum hidden rounded-[6px] border border-line px-2.5 py-1 text-[11px] text-muted sm:inline">
                {visibleChecks.length} / {checks.length}
              </span>
            </div>
          }
        />

        {checks.length === 0 ? (
          <EmptyState
            icon={<Activity className="h-4 w-4" />}
            title="No health checks yet"
            description="TraceStack hasn’t recorded a result for this monitor yet. Check back after its next scheduled run."
            action={
              <Button size="sm" onClick={() => void load(true)} disabled={refreshing}>
                Refresh history
              </Button>
            }
          />
        ) : visibleChecks.length === 0 ? (
          <EmptyState
            icon={<CircleCheck className="h-4 w-4" />}
            title={`No ${filter} checks`}
            description="Change the filter to see other results."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-line text-[11px] uppercase tracking-[0.1em] text-faint">
                  <th scope="col" className="px-5 py-2.5 font-medium">Result</th>
                  <th scope="col" className="px-5 py-2.5 font-medium">Checked at</th>
                  <th scope="col" className="px-5 py-2.5 font-medium">HTTP status</th>
                  <th scope="col" className="px-5 py-2.5 font-medium">Response time</th>
                  <th scope="col" className="px-5 py-2.5 font-medium">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/70">
                {visibleChecks.map((check) => (
                  <tr key={check.id} className="transition-colors hover:bg-ink/[0.02]">
                    <td className="whitespace-nowrap px-5 py-3">
                      <Badge tone={check.success ? "ok" : "crit"} dot>
                        {check.success ? "Success" : "Failed"}
                      </Badge>
                    </td>
                    <td className="tnum whitespace-nowrap px-5 py-3 text-muted">
                      {formatDate(check.checked_at)}
                    </td>
                    <td className="tnum px-5 py-3 font-mono text-[12px] text-muted">
                      {check.status_code ?? "—"}
                    </td>
                    <td className="tnum whitespace-nowrap px-5 py-3 text-muted">
                      {check.response_time_ms === null ? "—" : `${Math.round(check.response_time_ms)} ms`}
                    </td>
                    <td className="max-w-sm px-5 py-3 text-[12px] text-faint">
                      <span
                        className="line-clamp-2 break-words"
                        title={check.error_message || check.error_type || undefined}
                      >
                        {check.error_message ||
                          check.error_type ||
                          (check.success ? "No errors reported" : "No details provided")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <p className="mt-4 text-[11px] leading-5 text-faint">
        Metrics are calculated from the loaded check history, not a complete historical SLA. Up to 100
        recent checks are shown.
      </p>
    </>
  );
}
