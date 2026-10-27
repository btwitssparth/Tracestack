import Link from "next/link";

const features = [
  { number: "01", title: "Uptime monitoring", description: "Keep an eye on the endpoints that matter. TraceStack checks your services on a schedule and records each result." },
  { number: "02", title: "Incident detection", description: "Spot consecutive failures, follow active incidents, and see when a service recovers." },
  { number: "03", title: "Performance analytics", description: "Explore response times, recent check history, and uptime trends in one focused workspace." },
  { number: "04", title: "Notifications", description: "Keep operational changes visible with in-app notifications and configurable browser push support." },
];

function Mark({ className = "" }: { className?: string }) {
  return <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-300 text-sm font-black tracking-tight text-zinc-100 ${className}`}>T.</span>;
}

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#090b0d] text-zinc-100">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10">
        <Link href="/" className="flex items-center gap-3"><Mark /><span className="text-lg font-bold tracking-tight">TraceStack</span></Link>
        <nav className="hidden items-center gap-8 text-sm font-medium text-zinc-400 md:flex">
          <a href="#features" className="transition hover:text-zinc-100">Features</a>
          <a href="#workflow" className="transition hover:text-zinc-100">How it works</a>
          <a href="https://github.com/btwitssparth/Tracestack" target="_blank" rel="noreferrer" className="transition hover:text-zinc-100">GitHub ↗</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/login" className="hidden rounded-lg px-4 py-2.5 text-sm font-semibold transition hover:bg-white/[0.08] sm:inline-flex">Sign in</Link>
          <Link href="/login" className="rounded-lg bg-[#0c0f12] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/[0.08]">Get started <span aria-hidden="true">↗</span></Link>
        </div>
      </header>

      <section className="animate-fade-up mx-auto grid max-w-7xl items-center gap-14 px-6 pb-24 pt-16 lg:grid-cols-[1.02fr_.98fr] lg:px-10 lg:pb-32 lg:pt-24">
        <div>
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/[0.09] bg-[#0c0f12] px-3.5 py-2 text-xs font-semibold text-zinc-400 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-cyan-300" /> Website and API monitoring
          </div>
          <h1 className="max-w-2xl text-5xl font-semibold leading-[1.04] tracking-[-0.055em] sm:text-6xl lg:text-7xl">Know when your services go down.<span className="text-zinc-500"> Before your users tell you.</span></h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-zinc-400">Monitor uptime, follow incidents, and understand response-time trends from one calm, focused workspace.</p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link href="/login" className="inline-flex items-center gap-3 rounded-xl bg-[#0c0f12] px-6 py-4 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-white/[0.08]">Start monitoring <span aria-hidden="true">→</span></Link>
            <a href="#features" className="rounded-xl border border-white/[0.14] bg-[#0c0f12] px-6 py-4 text-sm font-semibold transition hover:border-white/30">Explore features</a>
          </div>
          <p className="mt-5 text-xs text-zinc-500">Simple setup. Clear signals. Less guesswork.</p>
        </div>

        <div className="relative">
          <div className="absolute -inset-5 rounded-[2rem] bg-cyan-300/10 blur-3xl" aria-hidden="true" />
          <div className="interactive-card relative overflow-hidden rounded-2xl border border-white/[0.09] bg-[#0c0f12] shadow-[0_24px_80px_-35px_rgba(0,0,0,0.8)]">
            <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
              <div className="flex items-center gap-2"><Mark className="h-7 w-7 rounded-lg text-xs" /><span className="text-sm font-semibold">Workspace overview</span></div>
              <span className="rounded-full bg-cyan-300/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-200">Monitor view</span>
            </div>
            <div className="grid grid-cols-3 gap-3 p-5">
              <div className="rounded-xl bg-white/[0.035] p-4"><p className="text-xs text-zinc-500">Monitors</p><p className="mt-2 text-2xl font-semibold">Your services</p><p className="mt-1 text-xs text-zinc-500">One workspace</p></div>
              <div className="rounded-xl bg-white/[0.035] p-4"><p className="text-xs text-zinc-500">Checks</p><p className="mt-2 text-2xl font-semibold">History</p><p className="mt-1 text-xs text-zinc-500">Every recorded result</p></div>
              <div className="rounded-xl bg-white/[0.035] p-4"><p className="text-xs text-zinc-500">Incidents</p><p className="mt-2 text-2xl font-semibold">Signals</p><p className="mt-1 text-xs text-zinc-500">Failures and recovery</p></div>
            </div>
            <div className="mx-5 mb-5 rounded-xl border border-white/[0.08] p-4">
              <div className="mb-5 flex items-center justify-between"><div><p className="text-sm font-semibold">Response time</p><p className="mt-1 text-xs text-zinc-500">Illustrative dashboard preview</p></div><span className="text-xs text-zinc-500">Recent checks</span></div>
              <div className="flex h-28 items-end gap-2" aria-label="Illustrative response-time chart">
                {[35, 52, 43, 66, 48, 75, 58, 82, 61, 72, 51, 68, 88, 60, 77, 56, 70, 48, 63, 80, 57, 74, 65, 90].map((height, index) => <span key={index} className={`flex-1 rounded-t-sm ${index === 12 ? "bg-orange-400" : "bg-cyan-300"}`} style={{ height: `${height}%` }} />)}
              </div>
              <div className="mt-3 flex justify-between text-[10px] text-zinc-500"><span>Earlier</span><span>Latest</span></div>
            </div>
            <div className="flex items-center gap-3 border-t border-white/[0.08] bg-white/[0.035] px-5 py-4"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-300/10 text-cyan-200">✓</span><div><p className="text-xs font-semibold">Built for visibility</p><p className="mt-1 text-xs text-zinc-500">A preview, not live service data</p></div></div>
          </div>
        </div>
      </section>

      <section id="features" className="border-y border-white/[0.09] bg-[#0c0f12]">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-24">
          <div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">One clear view</p><h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">The signals you need. Without the noise.</h2><p className="mt-4 leading-7 text-zinc-400">From a failed check to a recovered service, keep the important details close at hand.</p></div>
          <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-white/[0.09] bg-white/[0.08] sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => <article key={feature.number} className="interactive-card bg-[#0c0f12] p-6 sm:p-7"><p className="text-xs font-semibold text-zinc-500">{feature.number}</p><h3 className="mt-8 text-lg font-semibold">{feature.title}</h3><p className="mt-3 text-sm leading-6 text-zinc-400">{feature.description}</p></article>)}
          </div>
        </div>
      </section>

      <section id="workflow" className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-2 lg:items-center lg:px-10 lg:py-24">
        <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">A simpler workflow</p><h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">From endpoint to insight in a few steps.</h2><p className="mt-4 max-w-lg leading-7 text-zinc-400">TraceStack brings monitoring results and incident context together so you can spend less time piecing together what happened.</p></div>
        <div className="space-y-3">{[{ n: "01", title: "Add your endpoint", body: "Choose a URL and configure the expected response." },{ n: "02", title: "Watch checks run", body: "Review recorded outcomes, status codes, and response times." },{ n: "03", title: "Investigate and improve", body: "Use incident history and analytics to understand service health." }].map((step) => <div key={step.n} className="interactive-card flex gap-5 rounded-xl border border-white/[0.09] bg-[#0c0f12] p-5"><span className="pt-0.5 text-sm font-semibold text-zinc-500">{step.n}</span><div><h3 className="font-semibold">{step.title}</h3><p className="mt-1 text-sm leading-6 text-zinc-400">{step.body}</p></div></div>)}</div>
      </section>

      <section className="mx-6 mb-8 rounded-2xl bg-[#0c0f12] px-6 py-14 text-white sm:px-10 lg:mx-auto lg:max-w-7xl lg:px-14 lg:py-16">
        <div className="flex flex-col justify-between gap-8 sm:flex-row sm:items-center"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">Make the next outage less surprising</p><h2 className="mt-4 max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">Your services deserve a clearer signal.</h2></div><Link href="/login" className="inline-flex shrink-0 items-center justify-center gap-3 rounded-xl bg-cyan-300 px-6 py-4 text-sm font-bold text-zinc-100 transition hover:bg-cyan-200">Get started <span aria-hidden="true">→</span></Link></div>
      </section>
      <footer className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-8 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between lg:px-10"><Link href="/" className="flex items-center gap-2 font-semibold text-zinc-200"><Mark className="h-7 w-7 rounded-lg text-xs" />TraceStack</Link><p>Website and API monitoring, made easier to understand.</p><div className="flex gap-5"><Link href="/login" className="hover:text-white">Sign in</Link><a href="https://github.com/btwitssparth/Tracestack" target="_blank" rel="noreferrer" className="hover:text-white">GitHub ↗</a></div></footer>
    </main>
  );
}
