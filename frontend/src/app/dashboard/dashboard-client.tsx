"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  Check,
  CircleAlert,
  CircleCheck,
  CirclePause,
  Copy,
  Filter,
  Globe,
  Plus,
  RefreshCw,
  Search,
  TriangleAlert,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge, type Tone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { EmptyState, InlineAlert } from "@/components/ui/feedback";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Stat } from "@/components/ui/stat";

type Incident = {
  id: number;
  monitor_id: number;
  title: string;
  status: "open" | "resolved";
  started_at: string;
  resolved_at: string | null;
  summary: string | null;
};

type Monitor = {
  id: number;
  name: string;
  url: string;
  check_interval_seconds: number;
  expected_status_code: number;
  is_active: boolean;
  current_status: "unknown" | "up" | "down";
  consecutive_failures: number;
  last_checked_at: string | null;
  created_at: string;
};

type StatusKey = "up" | "down" | "pending" | "paused";

function absoluteDate(value: string | null) {
  if (!value) return "Not checked yet";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not checked yet" : date.toLocaleString();
}

function relativeTime(value: string | null) {
  if (!value) return "never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "never";
  const diff = Date.now() - date.getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function statusOf(monitor: Monitor): StatusKey {
  if (!monitor.is_active) return "paused";
  if (monitor.current_status === "up") return "up";
  if (monitor.current_status === "down") return "down";
  return "pending";
}

const statusMeta: Record<StatusKey, { label: string; tone: Tone; pulse?: boolean }> = {
  up: { label: "Operational", tone: "ok" },
  down: { label: "Down", tone: "crit", pulse: true },
  pending: { label: "Pending", tone: "warn" },
  paused: { label: "Paused", tone: "neutral" },
};

const statusBar: Record<StatusKey, string> = {
  up: "bg-ok",
  down: "bg-crit",
  pending: "bg-warn",
  paused: "bg-line-strong",
};

export default function DashboardClient() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [incidentsLoading, setIncidentsLoading] = useState(true);
  const [incidentsError, setIncidentsError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [monitorQuery, setMonitorQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | StatusKey>("all");
  const [copiedMonitorId, setCopiedMonitorId] = useState<number | null>(null);
  const [copyError, setCopyError] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [urlError, setUrlError] = useState("");
  const [createdMonitorName, setCreatedMonitorName] = useState("");

  const loadMonitors = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/monitors", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.detail || "Could not load monitors.");
      setMonitors(Array.isArray(body) ? body : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect to the monitoring API.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadIncidents = useCallback(async () => {
    setIncidentsLoading(true);
    setIncidentsError("");
    try {
      const response = await fetch("/api/incidents?limit=20", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.detail || "Could not load incidents.");
      setIncidents(Array.isArray(body) ? body : []);
    } catch (err) {
      setIncidentsError(err instanceof Error ? err.message : "Could not load incidents.");
    } finally {
      setIncidentsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMonitors();
    void loadIncidents();
  }, [loadMonitors, loadIncidents]);

  const stats = useMemo(() => {
    const up = monitors.filter((m) => m.is_active && m.current_status === "up").length;
    const down = monitors.filter((m) => m.is_active && m.current_status === "down").length;
    const paused = monitors.filter((m) => !m.is_active).length;
    const pending = monitors.length - up - down - paused;
    return { total: monitors.length, up, down, paused, pending };
  }, [monitors]);

  const openIncidents = incidents.filter((incident) => incident.status === "open").length;

  const filteredMonitors = useMemo(() => {
    const query = monitorQuery.trim().toLowerCase();
    return monitors.filter((monitor) => {
      const status = statusOf(monitor);
      const matchesStatus = statusFilter === "all" || status === statusFilter;
      const matchesQuery =
        !query || monitor.name.toLowerCase().includes(query) || monitor.url.toLowerCase().includes(query);
      return matchesStatus && matchesQuery;
    });
  }, [monitors, monitorQuery, statusFilter]);

  const busy = loading || incidentsLoading;

  async function copyMonitorUrl(monitor: Monitor) {
    setCopyError("");
    try {
      await navigator.clipboard.writeText(monitor.url);
      setCopiedMonitorId(monitor.id);
      window.setTimeout(
        () => setCopiedMonitorId((current) => (current === monitor.id ? null : current)),
        1800,
      );
    } catch {
      setCopyError("Could not copy the endpoint URL. Copy it directly from the monitor row.");
    }
  }

  async function createMonitor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const name = String(form.get("name") || "").trim();
    const rawUrl = String(form.get("url") || "").trim();
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(rawUrl);
    } catch {
      setUrlError("Enter a complete URL, such as https://example.com/health.");
      setFormError("Please fix the highlighted field.");
      setSaving(false);
      return;
    }
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      setUrlError("Use an HTTP or HTTPS URL.");
      setFormError("Please fix the highlighted field.");
      setSaving(false);
      return;
    }
    if (!name) {
      setFormError("Enter a name for this monitor.");
      setSaving(false);
      return;
    }
    setUrlError("");
    const payload = {
      name,
      url: parsedUrl.toString(),
      check_interval_seconds: Number(form.get("interval") || 300),
      expected_status_code: Number(form.get("expectedStatus") || 200),
      timeout_seconds: Number(form.get("timeout") || 10),
    };
    try {
      const response = await fetch("/api/monitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.detail || "Could not create monitor.");
      setCreatedMonitorName(name);
      setShowForm(false);
      formElement.reset();
      setUrlError("");
      await loadMonitors();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not create monitor.");
    } finally {
      setSaving(false);
    }
  }

  const fleet = ([
    ["up", stats.up],
    ["down", stats.down],
    ["pending", stats.pending],
    ["paused", stats.paused],
  ] as Array<[StatusKey, number]>).filter(([, count]) => count > 0);

  return (
    <>
      <PageHeader
        eyebrow="Service health"
        title="Your monitors, at a glance"
        description="Availability and recent activity across every endpoint in this workspace."
        actions={
          <>
            <Button
              onClick={() => {
                void loadMonitors();
                void loadIncidents();
              }}
              disabled={busy}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", busy && "animate-spin-slow")} />
              {busy ? "Refreshing" : "Refresh"}
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setFormError("");
                setUrlError("");
                setShowForm(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Add monitor
            </Button>
          </>
        }
      />

      {createdMonitorName && (
        <div className="mb-5 flex items-center gap-2 rounded-md border border-ok/25 bg-ok/[0.07] px-3.5 py-2.5 text-[13px] text-ok">
          <CircleCheck className="h-4 w-4 shrink-0" />
          <span className="flex-1">{createdMonitorName} was added successfully.</span>
          <button
            type="button"
            onClick={() => setCreatedMonitorName("")}
            aria-label="Dismiss success message"
            className="rounded p-0.5 text-ok/70 transition-colors hover:text-ok"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <section aria-label="Monitor statistics" className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
        <Stat label="Total" value={stats.total} icon={<Globe className="h-4 w-4" />} loading={loading} note="Monitored endpoints" />
        <Stat label="Operational" value={stats.up} tone="ok" icon={<CircleCheck className="h-4 w-4" />} loading={loading} note="Reporting healthy" />
        <Stat label="Down" value={stats.down} tone={stats.down ? "crit" : "neutral"} icon={<CircleAlert className="h-4 w-4" />} loading={loading} note={stats.down ? "Needs attention" : "All clear"} />
        <Stat label="Paused" value={stats.paused} icon={<CirclePause className="h-4 w-4" />} loading={loading} note="Checks disabled" />
        <Stat label="Open incidents" value={openIncidents} tone={openIncidents ? "warn" : "neutral"} icon={<TriangleAlert className="h-4 w-4" />} loading={incidentsLoading} note={openIncidents ? "Currently unresolved" : "No active outages"} />
      </section>

      <Panel className="mt-5" as="section">
        <div id="monitors" className="scroll-mt-20" />
        <PanelHeader
          icon={<Activity className="h-4 w-4" />}
          title="Monitors"
          description="Latest known status for each endpoint."
          actions={
            <span className="tnum rounded-[6px] border border-line px-2.5 py-1 text-[11px] text-muted">
              {filteredMonitors.length} / {stats.total}
            </span>
          }
        />

        {stats.total > 0 && (
          <div className="border-b border-line px-5 py-3.5">
            <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-canvas/70">
              {fleet.map(([key, count]) => (
                <span
                  key={key}
                  className={cn(statusBar[key], "h-full")}
                  style={{ width: `${(count / stats.total) * 100}%` }}
                  title={`${count} ${statusMeta[key].label.toLowerCase()}`}
                />
              ))}
            </div>
            <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
              {fleet.map(([key, count]) => (
                <span key={key} className="flex items-center gap-1.5 text-[11px] text-faint">
                  <span className={cn("h-1.5 w-1.5 rounded-full", statusBar[key])} />
                  <span className="text-muted">{statusMeta[key].label}</span>
                  <span className="tnum">{count}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 border-b border-line px-5 py-3.5 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
            <input
              value={monitorQuery}
              onChange={(event) => setMonitorQuery(event.target.value)}
              placeholder="Search by name or URL"
              aria-label="Search monitors"
              className="h-[38px] w-full rounded-md border border-line-strong bg-canvas/60 pl-9 pr-9 text-sm text-ink outline-none transition-colors placeholder:text-faint focus:border-accent/60"
            />
            {monitorQuery && (
              <button
                type="button"
                onClick={() => setMonitorQuery("")}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-faint transition-colors hover:text-ink"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 shrink-0 text-faint" />
            <Select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
              aria-label="Filter by status"
              className="w-full sm:w-44"
            >
              <option value="all">All statuses</option>
              <option value="up">Operational</option>
              <option value="down">Down</option>
              <option value="pending">Pending</option>
              <option value="paused">Paused</option>
            </Select>
          </div>
        </div>

        {error && (
          <div className="p-5">
            <InlineAlert
              icon={<CircleAlert className="h-4 w-4" />}
              action={
                <Button size="sm" variant="danger" onClick={() => void loadMonitors()}>
                  Try again
                </Button>
              }
            >
              {error}
            </InlineAlert>
          </div>
        )}
        {copyError && (
          <p role="alert" className="border-b border-line px-5 py-2.5 text-[12px] text-crit">
            {copyError}
          </p>
        )}

        {loading ? (
          <MonitorTableSkeleton />
        ) : monitors.length === 0 && !error ? (
          <div className="px-5 py-12 sm:px-8 sm:py-14">
            <div className="mx-auto max-w-xl text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg border border-accent/25 bg-accent/10 text-accent">
                <Activity className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-lg font-semibold tracking-[-0.01em] text-ink">
                Keep your first endpoint in view
              </h3>
              <p className="mx-auto mt-2 max-w-md text-[13px] leading-6 text-muted">
                Add a public website or API. TraceStack checks it on your schedule and surfaces
                failures here alongside incident activity and response history.
              </p>
              <Button
                variant="primary"
                className="mt-5"
                onClick={() => {
                  setFormError("");
                  setUrlError("");
                  setShowForm(true);
                }}
              >
                <Plus className="h-4 w-4" />
                Create your first monitor
              </Button>
            </div>
            <div className="mx-auto mt-10 grid max-w-3xl gap-3 text-left sm:grid-cols-3">
              {[
                { n: "01", title: "Add an endpoint", body: "Give it a recognizable name and a public HTTP or HTTPS URL." },
                { n: "02", title: "Choose a schedule", body: "Set how often to check and which HTTP status counts as healthy." },
                { n: "03", title: "Watch for changes", body: "Review status, check history, and incidents from the dashboard." },
              ].map((step) => (
                <article key={step.n} className="rounded-lg border border-line bg-canvas/40 p-4">
                  <span className="tnum text-[11px] font-semibold text-accent">{step.n}</span>
                  <h4 className="mt-2.5 text-[13px] font-semibold text-ink">{step.title}</h4>
                  <p className="mt-1.5 text-[12px] leading-5 text-faint">{step.body}</p>
                </article>
              ))}
            </div>
            <p className="mt-6 text-center text-[11px] text-faint">
              Only endpoints reachable from the monitoring server can be checked.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-line text-[11px] uppercase tracking-[0.1em] text-faint">
                    <th scope="col" className="px-5 py-2.5 font-medium">Monitor</th>
                    <th scope="col" className="px-5 py-2.5 font-medium">Status</th>
                    <th scope="col" className="px-5 py-2.5 font-medium">Interval</th>
                    <th scope="col" className="px-5 py-2.5 font-medium">Last checked</th>
                    <th scope="col" className="px-5 py-2.5 font-medium">Expected</th>
                    <th scope="col" className="px-5 py-2.5 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/70">
                  {filteredMonitors.map((monitor) => {
                    const meta = statusMeta[statusOf(monitor)];
                    return (
                      <tr key={monitor.id} className="group transition-colors hover:bg-ink/[0.02]">
                        <td className="max-w-md px-5 py-3.5">
                          <Link
                            href={`/dashboard/monitors/${monitor.id}`}
                            className="inline-flex items-center gap-1.5 font-medium text-ink transition-colors hover:text-accent"
                          >
                            {monitor.name}
                            <ArrowUpRight className="h-3.5 w-3.5 text-faint opacity-0 transition-opacity group-hover:opacity-100" />
                          </Link>
                          <p className="mt-0.5 truncate font-mono text-[11.5px] text-faint">{monitor.url}</p>
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge tone={meta.tone} dot pulse={meta.pulse}>{meta.label}</Badge>
                        </td>
                        <td className="tnum px-5 py-3.5 text-muted">
                          {Math.round(monitor.check_interval_seconds / 60)} min
                        </td>
                        <td className="tnum px-5 py-3.5 text-muted" title={absoluteDate(monitor.last_checked_at)}>
                          {relativeTime(monitor.last_checked_at)}
                        </td>
                        <td className="tnum px-5 py-3.5 font-mono text-[12px] text-muted">
                          {monitor.expected_status_code}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => void copyMonitorUrl(monitor)}
                              aria-label={`Copy URL for ${monitor.name}`}
                              className="flex h-7 items-center gap-1.5 rounded-[7px] border border-line px-2 text-[11px] text-muted transition-colors hover:border-line-strong hover:text-ink"
                            >
                              {copiedMonitorId === monitor.id ? (
                                <>
                                  <Check className="h-3 w-3 text-ok" />
                                  Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3" />
                                  Copy
                                </>
                              )}
                            </button>
                            <Link
                              href={`/dashboard/monitors/${monitor.id}`}
                              className="flex h-7 items-center rounded-[7px] border border-accent/25 bg-accent/[0.07] px-2 text-[11px] font-medium text-accent transition-colors hover:bg-accent/[0.13]"
                            >
                              Details
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <ul className="divide-y divide-line/70 md:hidden">
              {filteredMonitors.map((monitor) => {
                const meta = statusMeta[statusOf(monitor)];
                return (
                  <li key={monitor.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <Link
                        href={`/dashboard/monitors/${monitor.id}`}
                        className="min-w-0 font-medium text-ink"
                      >
                        <span className="block truncate">{monitor.name}</span>
                        <span className="mt-0.5 block truncate font-mono text-[11.5px] font-normal text-faint">
                          {monitor.url}
                        </span>
                      </Link>
                      <Badge tone={meta.tone} dot pulse={meta.pulse}>{meta.label}</Badge>
                    </div>
                    <dl className="tnum mt-3 grid grid-cols-3 gap-3 text-[12px]">
                      <div>
                        <dt className="text-faint">Interval</dt>
                        <dd className="mt-0.5 text-muted">{Math.round(monitor.check_interval_seconds / 60)} min</dd>
                      </div>
                      <div>
                        <dt className="text-faint">Checked</dt>
                        <dd className="mt-0.5 text-muted">{relativeTime(monitor.last_checked_at)}</dd>
                      </div>
                      <div>
                        <dt className="text-faint">Expected</dt>
                        <dd className="mt-0.5 font-mono text-muted">{monitor.expected_status_code}</dd>
                      </div>
                    </dl>
                    <div className="mt-3 flex gap-2">
                      <Link
                        href={`/dashboard/monitors/${monitor.id}`}
                        className="flex h-8 flex-1 items-center justify-center rounded-md border border-accent/25 bg-accent/[0.07] text-[12px] font-medium text-accent"
                      >
                        Details
                      </Link>
                      <button
                        type="button"
                        onClick={() => void copyMonitorUrl(monitor)}
                        aria-label={`Copy URL for ${monitor.name}`}
                        className="flex h-8 items-center justify-center gap-1.5 rounded-md border border-line px-3 text-[12px] text-muted"
                      >
                        {copiedMonitorId === monitor.id ? <Check className="h-3.5 w-3.5 text-ok" /> : <Copy className="h-3.5 w-3.5" />}
                        {copiedMonitorId === monitor.id ? "Copied" : "Copy"}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>

            {filteredMonitors.length === 0 && (
              <EmptyState
                icon={<Search className="h-4 w-4" />}
                title="No matching monitors"
                description="Try a different search term or status filter."
                action={
                  <Button
                    size="sm"
                    onClick={() => {
                      setMonitorQuery("");
                      setStatusFilter("all");
                    }}
                  >
                    Clear filters
                  </Button>
                }
              />
            )}
          </>
        )}
      </Panel>

      <Panel className="mt-5" as="section">
        <div id="incidents" className="scroll-mt-20" />
        <PanelHeader
          icon={<TriangleAlert className="h-4 w-4" />}
          title="Incident activity"
          description="Outages detected after consecutive failed checks."
          actions={
            <Badge tone={openIncidents ? "crit" : "neutral"} dot={openIncidents > 0}>
              {openIncidents ? `${openIncidents} open` : "None open"}
            </Badge>
          }
        />

        {incidentsError ? (
          <div className="p-5">
            <InlineAlert
              icon={<CircleAlert className="h-4 w-4" />}
              action={
                <Button size="sm" variant="danger" onClick={() => void loadIncidents()}>
                  Try again
                </Button>
              }
            >
              {incidentsError}
            </InlineAlert>
          </div>
        ) : incidentsLoading ? (
          <div className="divide-y divide-line/70">
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex items-center gap-4 px-5 py-4">
                <div className="skeleton h-8 w-8 rounded-md" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-3.5 w-56 max-w-full rounded" />
                  <div className="skeleton h-3 w-40 max-w-full rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : incidents.length === 0 ? (
          <EmptyState
            icon={<CircleCheck className="h-4 w-4" />}
            title="No incidents recorded"
            description="Incidents appear here after two consecutive failed checks."
            className="py-10"
          />
        ) : (
          <ul className="divide-y divide-line/70">
            {incidents.map((incident) => {
              const monitor = monitors.find((item) => item.id === incident.monitor_id);
              const open = incident.status === "open";
              return (
                <li key={incident.id} className="flex items-start gap-3.5 px-5 py-4">
                  <span
                    className={cn(
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border",
                      open ? "border-crit/25 bg-crit/10 text-crit" : "border-ok/25 bg-ok/10 text-ok",
                    )}
                  >
                    {open ? <CircleAlert className="h-4 w-4" /> : <CircleCheck className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
                      <h3 className="text-[13px] font-medium text-ink">{incident.title}</h3>
                      <Badge tone={open ? "crit" : "ok"} dot pulse={open}>
                        {open ? "Open" : "Resolved"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-[12px] text-faint">
                      <span className="text-muted">{monitor?.name ?? `Monitor #${incident.monitor_id}`}</span>
                      <span className="px-1.5 text-line-strong">·</span>
                      <span className="tnum">Started {absoluteDate(incident.started_at)}</span>
                      {incident.resolved_at && (
                        <>
                          <span className="px-1.5 text-line-strong">·</span>
                          <span className="tnum">Resolved {absoluteDate(incident.resolved_at)}</span>
                        </>
                      )}
                    </p>
                    {incident.summary && (
                      <p className="mt-2 line-clamp-2 text-[12px] leading-5 text-muted">{incident.summary}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <Modal
        open={showForm}
        onClose={() => {
          if (!saving) setShowForm(false);
        }}
        eyebrow="New endpoint"
        title="Add a monitor"
        description="TraceStack checks this endpoint on your selected interval and records each result."
        footer={
          <>
            <Button type="button" onClick={() => setShowForm(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" form="create-monitor-form" variant="primary" loading={saving}>
              {saving ? "Creating" : "Create monitor"}
            </Button>
          </>
        }
      >
        <form id="create-monitor-form" onSubmit={createMonitor} className="space-y-4">
          <Field label="Monitor name" hint="A short name to recognize this service in your dashboard.">
            <Input
              name="name"
              autoFocus
              required
              maxLength={100}
              placeholder="Production API"
              onChange={() => {
                if (formError) setFormError("");
              }}
            />
          </Field>

          <Field
            label="Endpoint URL"
            error={urlError || undefined}
            hint="Use the full public URL, including https://. A health endpoint is ideal."
          >
            <Input
              name="url"
              required
              type="url"
              inputMode="url"
              autoComplete="url"
              invalid={Boolean(urlError)}
              placeholder="https://api.example.com/health"
              onChange={() => {
                if (urlError) setUrlError("");
                if (formError) setFormError("");
              }}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Check interval">
              <Select name="interval" defaultValue="300">
                <option value="300">Every 5 minutes</option>
                <option value="600">Every 10 minutes</option>
                <option value="900">Every 15 minutes</option>
                <option value="1800">Every 30 minutes</option>
                <option value="3600">Every hour</option>
              </Select>
            </Field>
            <Field label="Expected status">
              <Select name="expectedStatus" defaultValue="200">
                <option value="200">200 OK</option>
                <option value="201">201 Created</option>
                <option value="204">204 No Content</option>
                <option value="301">301 Redirect</option>
                <option value="302">302 Redirect</option>
              </Select>
            </Field>
          </div>

          <Field label="Timeout" hint="How long to wait before a check is marked as failed.">
            <Select name="timeout" defaultValue="10">
              <option value="5">5 seconds</option>
              <option value="10">10 seconds</option>
              <option value="15">15 seconds</option>
              <option value="30">30 seconds</option>
            </Select>
          </Field>

          {formError && (
            <InlineAlert icon={<CircleAlert className="h-4 w-4" />}>{formError}</InlineAlert>
          )}
        </form>
      </Modal>
    </>
  );
}

function MonitorTableSkeleton() {
  return (
    <div className="divide-y divide-line/70">
      {[0, 1, 2, 3, 4].map((row) => (
        <div key={row} className="flex items-center gap-4 px-5 py-4">
          <div className="flex-1 space-y-2">
            <div className="skeleton h-3.5 w-44 max-w-full rounded" />
            <div className="skeleton h-3 w-64 max-w-full rounded" />
          </div>
          <div className="skeleton hidden h-6 w-24 rounded-[6px] sm:block" />
          <div className="skeleton hidden h-3.5 w-16 rounded md:block" />
          <div className="skeleton h-7 w-20 rounded-[7px]" />
        </div>
      ))}
    </div>
  );
}
