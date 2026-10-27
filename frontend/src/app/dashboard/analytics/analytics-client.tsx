"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  CircleAlert,
  CircleCheck,
  Clock,
  Gauge,
  LineChart,
  Search,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, InlineAlert, Skeleton } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Stat } from "@/components/ui/stat";
import { Select } from "@/components/ui/field";

type Monitor = {
  id: number;
  name: string;
  url: string;
  current_status: "unknown" | "up" | "down";
};
type Check = {
  id: number;
  monitor_id: number;
  checked_at: string;
  success: boolean;
  status_code: number | null;
  response_time_ms: number | null;
  error_type: string | null;
  error_message: string | null;
};

const ranges = [
  { label: "24h", hours: 24 },
  { label: "7d", hours: 24 * 7 },
  { label: "30d", hours: 24 * 30 },
];

function dateLabel(value: string) {
  return new Date(value).toLocaleString();
}

function shortTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AnalyticsClient() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [monitorId, setMonitorId] = useState("");
  const [checks, setChecks] = useState<Check[]>([]);
  const [rangeHours, setRangeHours] = useState(24 * 7);
  const [loadingMonitors, setLoadingMonitors] = useState(true);
  const [loadingChecks, setLoadingChecks] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/monitors", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.detail || "Could not load monitors.");
        if (!active) return;
        const items = Array.isArray(body) ? (body as Monitor[]) : [];
        setMonitors(items);
        if (items.length) setMonitorId(String(items[0].id));
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load monitors.");
      })
      .finally(() => {
        if (active) setLoadingMonitors(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!monitorId) {
      setChecks([]);
      setLoadingChecks(false);
      return;
    }
    let active = true;
    setLoadingChecks(true);
    setError("");
    setChecks([]);
    const cutoff = Date.now() - rangeHours * 60 * 60 * 1000;

    async function loadRange() {
      const allChecks: Check[] = [];
      const pageSize = 100;
      let offset = 0;

      while (active) {
        const response = await fetch(
          `/api/monitors/${encodeURIComponent(monitorId)}/checks?limit=${pageSize}&offset=${offset}`,
          { cache: "no-store" },
        );
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.detail || "Could not load check history.");
        const page = Array.isArray(body) ? (body as Check[]) : [];
        allChecks.push(...page);

        // The API returns newest checks first. Stop once we've reached the selected
        // period, or when there are no more pages.
        const oldestInPage = page.length
          ? new Date(page[page.length - 1].checked_at).getTime()
          : Number.NaN;
        if (page.length < pageSize || (Number.isFinite(oldestInPage) && oldestInPage < cutoff)) break;
        offset += page.length;
      }

      if (active) setChecks(allChecks);
    }

    loadRange()
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load check history.");
      })
      .finally(() => {
        if (active) setLoadingChecks(false);
      });

    return () => {
      active = false;
    };
  }, [monitorId, rangeHours]);

  // Checks are already narrowed to the selected period when they are loaded,
  // so the render path stays pure and free of time-based recalculation.
  const filtered = checks;
  const successes = filtered.filter((check) => check.success).length;
  const failures = filtered.length - successes;
  const uptime = filtered.length ? (successes / filtered.length) * 100 : null;
  const timedChecks = filtered.filter((check) => check.response_time_ms !== null);
  const average = timedChecks.length
    ? timedChecks.reduce((sum, check) => sum + (check.response_time_ms ?? 0), 0) / timedChecks.length
    : null;
  const peak = timedChecks.length
    ? Math.max(...timedChecks.map((check) => check.response_time_ms ?? 0))
    : null;
  const maxResponse = Math.max(1, ...timedChecks.map((check) => check.response_time_ms ?? 0));
  const selectedMonitor = monitors.find((monitor) => String(monitor.id) === monitorId);
  const chartPoints = [...timedChecks].reverse().slice(-40);

  return (
    <>
      <PageHeader
        eyebrow="Analysis"
        title="Response performance"
        description="Availability and response time derived from recorded checks for a single endpoint."
        actions={
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border border-line p-0.5">
              {ranges.map((range) => (
                <button
                  key={range.hours}
                  type="button"
                  onClick={() => setRangeHours(range.hours)}
                  aria-pressed={rangeHours === range.hours}
                  className={cn(
                    "tnum rounded-[5px] px-2.5 py-1.5 text-[12px] font-medium transition-colors",
                    rangeHours === range.hours
                      ? "bg-accent/12 text-accent"
                      : "text-muted hover:text-ink",
                  )}
                >
                  {range.label}
                </button>
              ))}
            </div>
            <Select
              value={monitorId}
              onChange={(event) => setMonitorId(event.target.value)}
              disabled={loadingMonitors || !monitors.length}
              aria-label="Select monitor"
              className="w-full min-w-0 sm:w-52"
            >
              {monitors.map((monitor) => (
                <option key={monitor.id} value={monitor.id}>
                  {monitor.name}
                </option>
              ))}
            </Select>
          </div>
        }
      />

      {error && (
        <InlineAlert className="mb-5" icon={<CircleAlert className="h-4 w-4" />}>
          {error}
        </InlineAlert>
      )}

      {!loadingMonitors && !monitors.length ? (
        <Panel>
          <EmptyState
            icon={<Activity className="h-4 w-4" />}
            title="No monitors yet"
            description="Add a monitor first to start collecting performance data."
            action={
              <ButtonLink href="/dashboard" variant="primary" size="sm">
                Go to dashboard
              </ButtonLink>
            }
          />
        </Panel>
      ) : (
        <>
          {selectedMonitor && (
            <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border border-line bg-panel px-4 py-3">
              <Badge
                tone={
                  selectedMonitor.current_status === "up"
                    ? "ok"
                    : selectedMonitor.current_status === "down"
                      ? "crit"
                      : "warn"
                }
                dot
                pulse={selectedMonitor.current_status === "down"}
              >
                {selectedMonitor.current_status === "up"
                  ? "Operational"
                  : selectedMonitor.current_status === "down"
                    ? "Down"
                    : "Pending"}
              </Badge>
              <span className="font-mono text-[12px] text-muted">{selectedMonitor.url}</span>
              <span className="text-[12px] text-faint">
                · {filtered.length} checks in the selected period
              </span>
            </div>
          )}

          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat
              label="Uptime"
              value={uptime === null ? "—" : uptime.toFixed(2)}
              unit={uptime === null ? undefined : "%"}
              tone={uptime !== null && uptime < 99 ? "warn" : "ok"}
              icon={<Gauge className="h-4 w-4" />}
              loading={loadingChecks}
              note={`${successes} successful checks`}
            />
            <Stat
              label="Avg response"
              value={average === null ? "—" : Math.round(average)}
              unit={average === null ? undefined : "ms"}
              icon={<Clock className="h-4 w-4" />}
              loading={loadingChecks}
              note={peak === null ? "No timing data" : `Peak ${Math.round(peak)} ms`}
            />
            <Stat
              label="Successful"
              value={successes}
              tone="ok"
              icon={<CircleCheck className="h-4 w-4" />}
              loading={loadingChecks}
              note="Within selected period"
            />
            <Stat
              label="Failed"
              value={failures}
              tone={failures ? "crit" : "neutral"}
              icon={<CircleAlert className="h-4 w-4" />}
              loading={loadingChecks}
              note={failures ? "Review checks below" : "No failures recorded"}
            />
          </section>

          <Panel className="mt-5">
            <PanelHeader
              icon={<LineChart className="h-4 w-4" />}
              title="Response-time trend"
              description={`Latest ${chartPoints.length} timed checks in the selected period`}
              actions={
                <div className="flex items-center gap-4 text-[11px] text-faint">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-sm bg-accent/70" />
                    Successful
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-sm bg-crit/80" />
                    Failed
                  </span>
                </div>
              }
            />
            <div className="px-5 py-5">
              {loadingChecks ? (
                <div className="flex h-44 items-end gap-1">
                  {Array.from({ length: 24 }).map((_, index) => (
                    <Skeleton key={index} className="flex-1" style-height={index} />
                  ))}
                </div>
              ) : chartPoints.length < 2 ? (
                <EmptyState
                  icon={<LineChart className="h-4 w-4" />}
                  title="Not enough history to draw a trend"
                  description="At least two timed checks are needed in this period."
                  className="py-8"
                />
              ) : (
                <div className="relative">
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-40">
                    {[0, 1, 2, 3].map((line) => (
                      <span
                        key={line}
                        className="absolute inset-x-0 border-t border-line/60"
                        style={{ top: `${(line / 3) * 100}%` }}
                      />
                    ))}
                  </div>
                  <div className="mb-1.5 flex items-center justify-between text-[11px] text-faint">
                    <span>response time (ms)</span>
                    <span className="tnum">peak {Math.round(maxResponse)} ms</span>
                  </div>
                  <div className="flex h-40 items-end gap-[3px]">
                    {chartPoints.map((check, index) => (
                      <div
                        key={check.id}
                        title={`${dateLabel(check.checked_at)} · ${Math.round(
                          check.response_time_ms ?? 0,
                        )} ms · ${check.success ? "Success" : "Failure"}`}
                        aria-label={`Check ${index + 1}: ${Math.round(check.response_time_ms ?? 0)} ms`}
                        className={cn(
                          "min-w-0 flex-1 rounded-t-[3px] transition-colors",
                          check.success ? "bg-accent/60 hover:bg-accent" : "bg-crit/75 hover:bg-crit",
                        )}
                        style={{
                          height: `${Math.max(3, ((check.response_time_ms ?? 0) / maxResponse) * 100)}%`,
                        }}
                      />
                    ))}
                  </div>
                  <div className="mt-2 flex items-center justify-between border-t border-line pt-2 text-[11px] text-faint">
                    <span className="tnum">{shortTime(chartPoints[0].checked_at)}</span>
                    <span>older → most recent</span>
                    <span className="tnum">
                      {shortTime(chartPoints[chartPoints.length - 1].checked_at)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </Panel>

          <Panel className="mt-5">
            <PanelHeader
              icon={<Activity className="h-4 w-4" />}
              title="Recent checks"
              description={`Newest first · ${filtered.length} in the selected period`}
            />
            {loadingChecks ? (
              <div className="divide-y divide-line/70">
                {[0, 1, 2, 3, 4].map((row) => (
                  <div key={row} className="flex items-center gap-4 px-5 py-3.5">
                    <Skeleton className="h-6 w-20 rounded-[6px]" />
                    <Skeleton className="h-3.5 w-40" />
                    <Skeleton className="ml-auto h-3.5 w-16" />
                  </div>
                ))}
              </div>
            ) : !filtered.length ? (
              <EmptyState
                icon={<Search className="h-4 w-4" />}
                title="No checks in this time range"
                description="Try a wider period, or wait for the next scheduled check."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-left text-[13px]">
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
                    {filtered.map((check) => (
                      <tr key={check.id} className="transition-colors hover:bg-ink/[0.02]">
                        <td className="px-5 py-3">
                          <Badge tone={check.success ? "ok" : "crit"} dot>
                            {check.success ? "Success" : "Failed"}
                          </Badge>
                        </td>
                        <td className="tnum whitespace-nowrap px-5 py-3 text-muted">
                          {dateLabel(check.checked_at)}
                        </td>
                        <td className="tnum px-5 py-3 font-mono text-[12px] text-muted">
                          {check.status_code ?? "—"}
                        </td>
                        <td className="tnum px-5 py-3 text-muted">
                          {check.response_time_ms === null ? "—" : `${Math.round(check.response_time_ms)} ms`}
                        </td>
                        <td className="max-w-xs px-5 py-3 text-[12px] text-faint">
                          <span className="line-clamp-2 break-words" title={check.error_message ?? undefined}>
                            {check.error_message ?? "—"}
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
            Metrics are calculated from the recorded checks loaded for the selected period, not a
            complete historical SLA.
          </p>
        </>
      )}
    </>
  );
}
