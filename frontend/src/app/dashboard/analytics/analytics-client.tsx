"use client";

import { useEffect, useMemo, useState } from "react";

type Monitor = {
  id: number; name: string; url: string; current_status: "unknown" | "up" | "down";
};
type Check = {
  id: number; monitor_id: number; checked_at: string; success: boolean;
  status_code: number | null; response_time_ms: number | null;
  error_type: string | null; error_message: string | null;
};

const ranges = [
  { label: "24 hours", hours: 24 },
  { label: "7 days", hours: 24 * 7 },
  { label: "30 days", hours: 24 * 30 },
];

function dateLabel(value: string) {
  return new Date(value).toLocaleString();
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
        const items = Array.isArray(body) ? body as Monitor[] : [];
        setMonitors(items);
        if (items.length) setMonitorId(String(items[0].id));
      })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Could not load monitors."); })
      .finally(() => { if (active) setLoadingMonitors(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!monitorId) { setChecks([]); setLoadingChecks(false); return; }
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
        const page = Array.isArray(body) ? body as Check[] : [];
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
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Could not load check history."); })
      .finally(() => { if (active) setLoadingChecks(false); });

    return () => { active = false; };
  }, [monitorId, rangeHours]);

  const cutoff = Date.now() - rangeHours * 60 * 60 * 1000;
  const filtered = useMemo(() => checks.filter((check) => new Date(check.checked_at).getTime() >= cutoff), [checks, cutoff]);
  const successes = filtered.filter((check) => check.success).length;
  const failures = filtered.length - successes;
  const uptime = filtered.length ? (successes / filtered.length) * 100 : null;
  const timedChecks = filtered.filter((check) => check.response_time_ms !== null);
  const average = timedChecks.length
    ? timedChecks.reduce((sum, check) => sum + (check.response_time_ms ?? 0), 0) / timedChecks.length
    : null;
  const maxResponse = Math.max(1, ...timedChecks.map((check) => check.response_time_ms ?? 0));
  const selectedMonitor = monitors.find((monitor) => String(monitor.id) === monitorId);
  const chartPoints = [...timedChecks].reverse().slice(-40);

  return (
    <main className="animate-fade-in min-h-screen bg-[#090b0d] px-5 py-8 text-zinc-100 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <a href="/dashboard" className="text-sm text-cyan-300 hover:text-cyan-200">← Back to dashboard</a>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Performance insights</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Monitor analytics</h1>
            <p className="mt-2 text-sm text-zinc-500">Availability and response time based on recorded checks.</p>
          </div>
          <label className="flex flex-col gap-2 text-xs text-zinc-400">
            Select monitor
            <select value={monitorId} onChange={(event) => setMonitorId(event.target.value)} disabled={loadingMonitors || !monitors.length}
              className="min-w-64 cursor-pointer rounded-xl border border-white/10 bg-[#111518] px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-cyan-300/50">
              {monitors.map((monitor) => <option className="bg-[#111518] text-zinc-100" key={monitor.id} value={monitor.id}>{monitor.name}</option>)}
            </select>
          </label>
        </div>

        {error && <p role="alert" className="mb-5 rounded-xl border border-rose-400/20 bg-rose-400/5 p-4 text-sm text-rose-200">{error}</p>}
        {!loadingMonitors && !monitors.length && <div className="interactive-card rounded-2xl border border-white/10 bg-white/[0.025] p-8 text-center"><p className="font-medium">No monitors yet</p><p className="mt-2 text-sm text-zinc-500">Add a monitor first to start collecting analytics.</p><a href="/dashboard" className="mt-4 inline-block text-sm text-cyan-300">Go to dashboard</a></div>}

        {monitors.length > 0 && <>
          <div className="mb-5 flex flex-wrap gap-2">
            {ranges.map((range) => <button key={range.hours} onClick={() => setRangeHours(range.hours)} className={`interactive-control rounded-xl border px-3 py-2 text-sm transition ${rangeHours === range.hours ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-200" : "border-white/10 text-zinc-400 hover:bg-white/[0.04]"}`}>{range.label}</button>)}
          </div>
          <p className="mb-4 text-xs text-zinc-500">{selectedMonitor?.url} · {selectedMonitor?.current_status === "up" ? "Currently operational" : selectedMonitor?.current_status === "down" ? "Currently down" : "Status pending"} · Complete recorded history for selected period</p>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Uptime", value: uptime === null ? "—" : `${uptime.toFixed(2)}%`, note: `${successes} successful checks` },
              { label: "Average response", value: average === null ? "—" : `${Math.round(average)} ms`, note: "Successful and failed checks with timing" },
              { label: "Successful checks", value: String(successes), note: "Within selected period" },
              { label: "Failed checks", value: String(failures), note: "Within selected period" },
            ].map((item) => <div key={item.label} className="interactive-card rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5"><p className="text-sm text-zinc-400">{item.label}</p><p className="mt-3 text-3xl font-semibold tracking-tight">{item.value}</p><p className="mt-2 text-xs text-zinc-600">{item.note}</p></div>)}
          </section>

          <section className="interactive-card mt-5 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="font-semibold">Response-time trend</h2><p className="mt-1 text-xs text-zinc-500">Latest recorded checks in the selected period</p></div><p className="text-xs text-zinc-500">{timedChecks.length} timed checks</p></div>
            {loadingChecks ? <p className="py-12 text-center text-sm text-zinc-500">Loading check history…</p> : chartPoints.length < 2 ? <p className="py-12 text-center text-sm text-zinc-500">Not enough check history to draw a trend yet.</p> : <div className="mt-6">
              <div className="flex h-44 items-end gap-1 border-b border-l border-white/10 px-2 pt-2">
                {chartPoints.map((check, index) => <div key={check.id} title={`${dateLabel(check.checked_at)} · ${Math.round(check.response_time_ms ?? 0)} ms · ${check.success ? "Success" : "Failure"}`} className={`min-w-0 flex-1 rounded-t-sm ${check.success ? "bg-cyan-300/70" : "bg-rose-400/80"}`} style={{ height: `${Math.max(4, ((check.response_time_ms ?? 0) / maxResponse) * 100)}%` }} aria-label={`Check ${index + 1}`} />)}
              </div>
              <div className="mt-3 flex justify-between text-[11px] text-zinc-600"><span>Older</span><span>Most recent</span></div>
            </div>}
            <div className="mt-4 flex flex-wrap gap-4 text-xs text-zinc-500"><span><span className="mr-2 inline-block h-2 w-2 rounded-full bg-cyan-300" />Successful check</span><span><span className="mr-2 inline-block h-2 w-2 rounded-full bg-rose-400" />Failed check</span></div>
          </section>

          <section className="mt-5 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025]">
            <div className="border-b border-white/[0.08] px-5 py-4"><h2 className="font-semibold">Recent checks</h2><p className="mt-1 text-xs text-zinc-500">Newest first · {filtered.length} checks in selected period</p></div>
            {loadingChecks ? <p className="p-6 text-sm text-zinc-500">Loading check history…</p> : !filtered.length ? <p className="p-6 text-sm text-zinc-500">No checks recorded in this time range yet.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-white/[0.025] text-xs text-zinc-500"><tr><th className="px-5 py-3 font-medium">Checked at</th><th className="px-5 py-3 font-medium">Result</th><th className="px-5 py-3 font-medium">HTTP status</th><th className="px-5 py-3 font-medium">Response time</th><th className="px-5 py-3 font-medium">Details</th></tr></thead><tbody>{filtered.map((check) => <tr key={check.id} className="border-t border-white/[0.06]"><td className="whitespace-nowrap px-5 py-3 text-zinc-400">{dateLabel(check.checked_at)}</td><td className="px-5 py-3"><span className={`rounded-full px-2.5 py-1 text-xs ${check.success ? "bg-emerald-400/10 text-emerald-300" : "bg-rose-400/10 text-rose-300"}`}>{check.success ? "Success" : "Failed"}</span></td><td className="px-5 py-3 text-zinc-400">{check.status_code ?? "—"}</td><td className="px-5 py-3 text-zinc-400">{check.response_time_ms === null ? "—" : `${Math.round(check.response_time_ms)} ms`}</td><td className="max-w-xs px-5 py-3 text-xs text-zinc-500">{check.error_message ?? "—"}</td></tr>)}</tbody></table></div>}
          </section>
        </>}
      </div>
    </main>
  );
}
