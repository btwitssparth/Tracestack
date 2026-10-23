"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import SignOutButton from "./sign-out-button";

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

function formatDate(value: string | null) {
  if (!value) return "Not checked yet";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not checked yet" : date.toLocaleString();
}

function statusLabel(monitor: Monitor) {
  if (!monitor.is_active) return "Paused";
  if (monitor.current_status === "up") return "Operational";
  if (monitor.current_status === "down") return "Down";
  return "Pending";
}

export default function DashboardClient({ email }: { email: string }) {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

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

  useEffect(() => { void loadMonitors(); }, [loadMonitors]);

  const stats = useMemo(() => ({
    total: monitors.length,
    up: monitors.filter((m) => m.is_active && m.current_status === "up").length,
    down: monitors.filter((m) => m.is_active && m.current_status === "down").length,
    paused: monitors.filter((m) => !m.is_active).length,
  }), [monitors]);

  async function createMonitor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get("name") || "").trim(),
      url: String(form.get("url") || "").trim(),
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
      setShowForm(false);
      event.currentTarget.reset();
      await loadMonitors();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not create monitor.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#090b0d] text-zinc-100">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-white/[0.08] bg-[#0c0f12] px-5 py-6 lg:flex">
        <a href="/dashboard" className="flex items-center gap-3 px-2 text-lg font-bold tracking-wide text-cyan-300">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-300/10 text-sm">TS</span>
          TRACESTACK
        </a>
        <p className="mb-3 mt-10 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-600">Workspace</p>
        <a href="#overview" className="flex items-center gap-3 rounded-xl border border-cyan-300/15 bg-cyan-300/[0.08] px-3 py-3 text-sm font-medium text-cyan-200"><span>▦</span> Overview</a>
        <a href="#monitors" className="mt-1 flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-zinc-400 transition hover:bg-white/[0.04] hover:text-white"><span>◉</span> Monitors</a>
        <a href="#incidents" className="mt-1 flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-zinc-400 transition hover:bg-white/[0.04] hover:text-white"><span>△</span> Incidents</a>
        <div className="mt-auto rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-zinc-300"><span className="h-2 w-2 rounded-full bg-emerald-400" /> API connection</div>
          <p className="text-xs leading-5 text-zinc-500">Monitor data is loaded securely through your signed-in session.</p>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="flex min-h-[76px] items-center justify-between border-b border-white/[0.08] px-5 sm:px-8">
          <div><p className="text-xs text-zinc-500">Workspace / Overview</p><p className="mt-1 text-sm font-medium text-zinc-200">Monitoring dashboard</p></div>
          <div className="flex items-center gap-3">
            <span className="hidden max-w-56 truncate text-sm text-zinc-400 sm:block">{email}</span>
            <SignOutButton />
          </div>
        </header>

        <main id="overview" className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8 sm:py-10">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">System overview</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Your monitors, at a glance.</h1>
              <p className="mt-2 text-sm text-zinc-500">Keep an eye on availability and catch issues early.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => void loadMonitors()} disabled={loading} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-zinc-300 transition hover:bg-white/[0.05] disabled:opacity-50">{loading ? "Refreshing…" : "↻ Refresh"}</button>
              <button onClick={() => { setFormError(""); setShowForm(true); }} className="rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-200">＋ Add monitor</button>
            </div>
          </div>

          <section aria-label="Monitor statistics" className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Total monitors", value: stats.total, note: "Across your workspace", icon: "◉" },
              { label: "Operational", value: stats.up, note: "Currently reporting up", icon: "↗" },
              { label: "Down", value: stats.down, note: "Needs your attention", icon: "!" },
              { label: "Paused", value: stats.paused, note: "Checks temporarily disabled", icon: "Ⅱ" },
            ].map((card, index) => (
              <article key={card.label} className="rounded-2xl border border-white/[0.08] bg-[#101316] p-5">
                <div className="flex items-center justify-between"><span className="text-sm text-zinc-400">{card.label}</span><span className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm ${index === 2 ? "bg-rose-400/10 text-rose-300" : "bg-cyan-300/10 text-cyan-200"}`}>{card.icon}</span></div>
                <p className="mt-5 text-3xl font-semibold tracking-tight">{loading ? "—" : card.value}</p>
                <p className="mt-2 text-xs text-zinc-600">{card.note}</p>
              </article>
            ))}
          </section>

          <section id="monitors" className="mt-8 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#101316]">
            <div className="flex flex-col gap-3 border-b border-white/[0.07] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div><h2 className="font-semibold">All monitors</h2><p className="mt-1 text-sm text-zinc-500">Your endpoints and their latest known status.</p></div>
              <span className="w-fit rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-400">{stats.total} total</span>
            </div>
            {error && <div role="alert" className="m-5 rounded-xl border border-rose-400/20 bg-rose-400/[0.06] p-4 text-sm text-rose-200">{error}<button onClick={() => void loadMonitors()} className="ml-3 underline">Try again</button></div>}
            {loading ? <div className="p-12 text-center text-sm text-zinc-500">Loading your monitors…</div> :
              monitors.length === 0 && !error ? (
                <div className="px-6 py-16 text-center sm:py-20">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.07] text-2xl text-cyan-200">⌁</div>
                  <h3 className="mt-5 text-lg font-semibold">Nothing to monitor yet</h3>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">Add a public website or API endpoint. TraceStack will check it on a schedule and show its latest status here.</p>
                  <button onClick={() => { setFormError(""); setShowForm(true); }} className="mt-6 rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-cyan-200">＋ Create your first monitor</button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="bg-white/[0.02] text-xs uppercase tracking-wider text-zinc-600"><tr><th className="px-6 py-4 font-medium">Monitor</th><th className="px-6 py-4 font-medium">Status</th><th className="px-6 py-4 font-medium">Interval</th><th className="px-6 py-4 font-medium">Last checked</th><th className="px-6 py-4 font-medium">Expected</th></tr></thead>
                    <tbody className="divide-y divide-white/[0.06]">
                      {monitors.map((monitor) => {
                        const status = statusLabel(monitor);
                        const tone = status === "Operational" ? "bg-emerald-400/10 text-emerald-300" : status === "Down" ? "bg-rose-400/10 text-rose-300" : "bg-amber-300/10 text-amber-200";
                        return <tr key={monitor.id} className="transition hover:bg-white/[0.02]">
                          <td className="px-6 py-4"><p className="font-medium text-zinc-200">{monitor.name}</p><p className="mt-1 max-w-sm truncate text-xs text-zinc-500">{monitor.url}</p></td>
                          <td className="px-6 py-4"><span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs ${tone}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{status}</span></td>
                          <td className="px-6 py-4 text-zinc-400">{Math.round(monitor.check_interval_seconds / 60)} min</td>
                          <td className="px-6 py-4 text-zinc-500">{formatDate(monitor.last_checked_at)}</td>
                          <td className="px-6 py-4 text-zinc-400">{monitor.expected_status_code}</td>
                        </tr>;
                      })}
                    </tbody>
                  </table>
                </div>
              )}
          </section>

          <section id="incidents" className="mt-6 rounded-2xl border border-white/[0.08] bg-[#101316] p-5 sm:p-6">
            <div className="flex items-start gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-300/10 text-amber-200">△</span><div><h2 className="font-semibold">Incident activity</h2><p className="mt-1 text-sm text-zinc-500">Incident history will appear here as monitor checks detect and resolve outages.</p></div></div>
            <div className="mt-5 rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-zinc-600">No incident activity to display yet.</div>
          </section>
          <p className="mt-8 text-center text-xs text-zinc-700">TraceStack · Monitor with confidence</p>
        </main>
      </div>

      {showForm && <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
        <div role="dialog" aria-modal="true" aria-labelledby="add-monitor-title" className="my-8 w-full max-w-lg rounded-2xl border border-white/10 bg-[#111518] p-6 shadow-2xl sm:p-7">
          <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">New endpoint</p><h2 id="add-monitor-title" className="mt-2 text-xl font-semibold">Add a monitor</h2><p className="mt-1 text-sm text-zinc-500">Configure the endpoint you want to keep an eye on.</p></div><button onClick={() => setShowForm(false)} aria-label="Close" className="rounded-lg px-2 py-1 text-xl text-zinc-500 hover:bg-white/5 hover:text-white">×</button></div>
          <form onSubmit={createMonitor} className="mt-6 space-y-4">
            <label className="block text-sm text-zinc-300">Monitor name<input name="name" required maxLength={100} placeholder="Production API" className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3.5 py-3 text-sm outline-none placeholder:text-zinc-700 focus:border-cyan-300/50" /></label>
            <label className="block text-sm text-zinc-300">Endpoint URL<input name="url" required type="url" placeholder="https://api.example.com/health" className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3.5 py-3 text-sm outline-none placeholder:text-zinc-700 focus:border-cyan-300/50" /></label>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><label className="block text-sm text-zinc-300">Check interval<select name="interval" defaultValue="300" className="mt-2 w-full rounded-xl border border-white/10 bg-[#0c0f12] px-3 py-3 text-sm outline-none focus:border-cyan-300/50"><option value="300">Every 5 minutes</option><option value="600">Every 10 minutes</option><option value="900">Every 15 minutes</option><option value="1800">Every 30 minutes</option><option value="3600">Every hour</option></select></label><label className="block text-sm text-zinc-300">Expected status<select name="expectedStatus" defaultValue="200" className="mt-2 w-full rounded-xl border border-white/10 bg-[#0c0f12] px-3 py-3 text-sm outline-none focus:border-cyan-300/50"><option value="200">200 OK</option><option value="201">201 Created</option><option value="204">204 No Content</option><option value="301">301 Redirect</option><option value="302">302 Redirect</option></select></label></div>
            <label className="block text-sm text-zinc-300">Timeout<select name="timeout" defaultValue="10" className="mt-2 w-full rounded-xl border border-white/10 bg-[#0c0f12] px-3 py-3 text-sm outline-none focus:border-cyan-300/50"><option value="5">5 seconds</option><option value="10">10 seconds</option><option value="15">15 seconds</option><option value="30">30 seconds</option></select></label>
            {formError && <p role="alert" className="rounded-lg border border-rose-400/20 bg-rose-400/[0.06] p-3 text-sm text-rose-200">{formError}</p>}
            <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5">Cancel</button><button type="submit" disabled={saving} className="rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-cyan-200 disabled:opacity-60">{saving ? "Creating…" : "Create monitor"}</button></div>
          </form>
        </div>
      </div>}
    </div>
  );
}
