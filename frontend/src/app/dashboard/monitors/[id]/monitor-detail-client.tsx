"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

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

function formatDate(value: string | null) {
  if (!value) return "Not checked yet";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not available" : date.toLocaleString();
}

function formatDuration(seconds: number) {
  if (seconds >= 3600 && seconds % 3600 === 0) return `${seconds / 3600} hr${seconds === 3600 ? "" : "s"}`;
  if (seconds >= 60 && seconds % 60 === 0) return `${seconds / 60} min`;
  return `${seconds} sec`;
}

function StatusBadge({ monitor }: { monitor: Monitor }) {
  const status = !monitor.is_active ? "Paused" : monitor.current_status === "up" ? "Operational" : monitor.current_status === "down" ? "Down" : "Pending";
  const style = status === "Operational" ? "bg-emerald-400/10 text-emerald-300 ring-emerald-400/20" : status === "Down" ? "bg-rose-400/10 text-rose-300 ring-rose-400/20" : status === "Paused" ? "bg-zinc-400/10 text-zinc-300 ring-white/10" : "bg-amber-300/10 text-amber-200 ring-amber-300/20";
  const dot = status === "Operational" ? "bg-emerald-300" : status === "Down" ? "bg-rose-300" : status === "Paused" ? "bg-zinc-400" : "bg-amber-200";
  return <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset ${style}`}><span className={`h-2 w-2 rounded-full ${dot}`} />{status}</span>;
}

function Skeleton() {
  return <main className="min-h-screen animate-fade-in bg-[#090b0d] px-4 py-8 text-zinc-100 sm:px-8">
    <div className="mx-auto max-w-6xl">
      <div className="h-4 w-36 animate-pulse rounded bg-white/[0.07]" />
      <div className="mt-8 border-b border-white/[0.08] pb-7"><div className="h-3 w-28 animate-pulse rounded bg-white/[0.07]" /><div className="mt-4 h-9 w-64 max-w-full animate-pulse rounded-lg bg-white/[0.07]" /><div className="mt-4 h-4 w-80 max-w-full animate-pulse rounded bg-white/[0.07]" /></div>
      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[1, 2, 3, 4].map((item) => <div key={item} className="rounded-2xl border border-white/[0.08] bg-[#0c0f12] p-5"><div className="h-4 w-28 animate-pulse rounded bg-white/[0.07]" /><div className="mt-4 h-8 w-24 animate-pulse rounded bg-white/[0.07]" /></div>)}</div>
      <div className="mt-7 rounded-2xl border border-white/[0.08] bg-[#0c0f12] p-6"><div className="h-5 w-40 animate-pulse rounded bg-white/[0.07]" /><div className="mt-6 h-40 animate-pulse rounded-xl bg-white/[0.035]" /></div>
    </div>
  </main>;
}

export default function MonitorDetailClient({ monitorId }: { monitorId: string }) {
  const [monitor, setMonitor] = useState<Monitor | null>(null);
  const [checks, setChecks] = useState<Check[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const [monitorResponse, checksResponse] = await Promise.all([
        fetch("/api/monitors", { cache: "no-store" }),
        fetch("/api/monitors/" + encodeURIComponent(monitorId) + "/checks?limit=100", { cache: "no-store" }),
      ]);
      const monitorBody = await monitorResponse.json().catch(() => ({}));
      const checksBody = await checksResponse.json().catch(() => ({}));
      if (!monitorResponse.ok) throw new Error(monitorBody.detail || "Could not load monitors.");
      if (!checksResponse.ok) throw new Error(checksBody.detail || "Could not load check history.");
      const found = (Array.isArray(monitorBody) ? monitorBody : []).find((item: Monitor) => String(item.id) === monitorId);
      if (!found) throw new Error("Monitor not found, or access is unavailable.");
      setMonitor(found);
      setChecks(Array.isArray(checksBody) ? checksBody : []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load monitor details.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [monitorId]);

  useEffect(() => { void load(); }, [load]);

  if (loading) return <Skeleton />;
  if (error && !monitor) return <main className="min-h-screen bg-[#090b0d] px-5 py-12 text-zinc-100 sm:px-8"><div className="mx-auto max-w-2xl rounded-2xl border border-rose-400/20 bg-[#0c0f12] p-7 sm:p-9"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-400/10 text-xl text-rose-300">!</span><h1 className="mt-5 text-2xl font-semibold">Monitor unavailable</h1><p className="mt-2 text-sm leading-6 text-zinc-400">{error}</p><div className="mt-6 flex flex-wrap gap-3"><button onClick={() => void load()} className="interactive-control rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-cyan-200">Try again</button><Link className="interactive-control rounded-xl border border-white/10 px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/[0.04]" href="/dashboard">Back to dashboard</Link></div></div></main>;
  if (!monitor) return null;

  const successful = checks.filter((check) => check.success).length;
  const failed = checks.length - successful;
  const timedChecks = checks.filter((check) => check.response_time_ms !== null);
  const average = timedChecks.length ? Math.round(timedChecks.reduce((sum, check) => sum + (check.response_time_ms ?? 0), 0) / timedChecks.length) : null;
  const uptime = checks.length ? (successful / checks.length) * 100 : null;
  const latestFailure = checks.find((check) => !check.success);
  const stats = [
    { label: "Uptime in loaded history", value: uptime === null ? "—" : `${uptime.toFixed(2)}%`, note: checks.length ? `${successful} of ${checks.length} checks succeeded` : "Waiting for first check", tone: "text-zinc-100" },
    { label: "Average response", value: average === null ? "—" : `${average} ms`, note: timedChecks.length ? `Across ${timedChecks.length} timed checks` : "No timing data yet", tone: "text-zinc-100" },
    { label: "Failed checks", value: String(failed), note: failed ? "Review recent check details below" : "No failures in loaded history", tone: failed ? "text-rose-300" : "text-zinc-100" },
    { label: "Check interval", value: formatDuration(monitor.check_interval_seconds), note: `Expected HTTP ${monitor.expected_status_code}`, tone: "text-zinc-100" },
  ];

  return <main className="animate-fade-in min-h-screen bg-[#090b0d] px-4 py-7 text-zinc-100 sm:px-8 sm:py-9">
    <div className="mx-auto max-w-6xl">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm text-zinc-500">
        <Link href="/dashboard" className="interactive-control rounded-md hover:text-cyan-200">Dashboard</Link><span aria-hidden="true">/</span><span className="text-zinc-300">Monitor details</span>
      </nav>

      <header className="mt-7 flex flex-col gap-5 border-b border-white/[0.08] pb-7 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Endpoint overview</p>
          <h1 className="mt-2 break-words text-3xl font-semibold tracking-tight sm:text-4xl">{monitor.name}</h1>
          <a href={monitor.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex max-w-full items-center gap-2 break-all text-sm text-zinc-400 underline decoration-white/20 underline-offset-4 transition hover:text-cyan-200">{monitor.url}<span aria-hidden="true">↗</span></a>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-500"><span>Last checked: {formatDate(monitor.last_checked_at)}</span><span>Created: {formatDate(monitor.created_at)}</span></div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3 sm:justify-end"><StatusBadge monitor={monitor} /><button onClick={() => void load(true)} disabled={refreshing} className="interactive-control inline-flex items-center gap-2 rounded-xl border border-white/10 px-3.5 py-2.5 text-sm font-medium text-zinc-300 hover:border-cyan-300/30 hover:bg-white/[0.04] disabled:cursor-wait disabled:opacity-50"><span aria-hidden="true" className={refreshing ? "animate-spin" : ""}>↻</span>{refreshing ? "Refreshing…" : "Refresh"}</button></div>
      </header>

      {error && <div role="alert" className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-400/20 bg-rose-400/[0.05] px-4 py-3 text-sm text-rose-200"><span>{error}</span><button onClick={() => void load(true)} className="font-medium underline underline-offset-4 hover:text-rose-100">Try again</button></div>}

      <section aria-label="Monitor metrics" className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => <article key={stat.label} className={`interactive-card rounded-2xl border border-white/[0.08] bg-[#0c0f12] p-5 ${index === 0 ? "border-t-2 border-t-cyan-300/50" : ""}`}><p className="text-sm text-zinc-400">{stat.label}</p><p className={`mt-4 text-3xl font-semibold tracking-tight ${stat.tone}`}>{stat.value}</p><p className="mt-2 text-xs leading-5 text-zinc-500">{stat.note}</p></article>)}
      </section>

      {monitor.current_status === "down" && monitor.is_active && <section aria-label="Current outage" className="mt-5 rounded-2xl border border-rose-400/20 bg-rose-400/[0.045] p-5"><div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-400/10 font-semibold text-rose-300">!</span><div className="min-w-0"><h2 className="font-semibold text-rose-200">This endpoint is reporting as down</h2><p className="mt-1 text-sm leading-6 text-zinc-400">{latestFailure ? latestFailure.error_message || latestFailure.error_type || "The latest recorded failure did not include additional error details." : "Check the latest health-check results below for more information."}</p>{latestFailure && <p className="mt-2 text-xs text-zinc-500">Last failure recorded: {formatDate(latestFailure.checked_at)}</p>}</div></div></section>}

      <section className="mt-6 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c0f12]">
        <div className="flex flex-col gap-3 border-b border-white/[0.08] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div><h2 className="text-lg font-semibold">Health-check history</h2><p className="mt-1 text-sm text-zinc-500">Recent results recorded for this endpoint.</p></div><span className="w-fit rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-400">{checks.length} loaded checks · latest 100 max</span></div>
        {checks.length === 0 ? <div className="px-6 py-14 text-center"><span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-300/15 bg-cyan-300/[0.06] text-xl text-cyan-200">⌁</span><h3 className="mt-4 font-medium">No health checks yet</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">TraceStack hasn’t recorded a result for this monitor yet. Check back after its next scheduled run.</p><button onClick={() => void load(true)} disabled={refreshing} className="interactive-control mt-5 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/[0.04] disabled:opacity-50">{refreshing ? "Refreshing…" : "Refresh history"}</button></div> : <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-white/[0.025] text-xs uppercase tracking-wider text-zinc-500"><tr><th scope="col" className="px-5 py-3.5 font-medium">Result</th><th scope="col" className="px-5 py-3.5 font-medium">Checked at</th><th scope="col" className="px-5 py-3.5 font-medium">HTTP status</th><th scope="col" className="px-5 py-3.5 font-medium">Response time</th><th scope="col" className="px-5 py-3.5 font-medium">Details</th></tr></thead><tbody className="divide-y divide-white/[0.06]">{checks.map((check) => <tr key={check.id} className="transition-colors hover:bg-white/[0.02]"><td className="whitespace-nowrap px-5 py-4"><span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium ${check.success ? "bg-emerald-400/10 text-emerald-300" : "bg-rose-400/10 text-rose-300"}`}><span className={`h-1.5 w-1.5 rounded-full ${check.success ? "bg-emerald-300" : "bg-rose-300"}`} />{check.success ? "Success" : "Failed"}</span></td><td className="whitespace-nowrap px-5 py-4 text-zinc-400">{formatDate(check.checked_at)}</td><td className="px-5 py-4 text-zinc-300">{check.status_code ?? "—"}</td><td className="whitespace-nowrap px-5 py-4 text-zinc-300">{check.response_time_ms === null ? "—" : `${Math.round(check.response_time_ms)} ms`}</td><td className="max-w-sm px-5 py-4 text-xs leading-5 text-zinc-500"><span className="line-clamp-2 break-words" title={check.error_message || check.error_type || undefined}>{check.error_message || check.error_type || (check.success ? "No errors reported" : "No details provided")}</span></td></tr>)}</tbody></table></div>}
      </section>
      <p className="mt-4 text-xs leading-5 text-zinc-600">Metrics are calculated from the loaded check history, not a complete historical SLA. Up to 100 recent checks are shown.</p>
    </div>
  </main>;
}
