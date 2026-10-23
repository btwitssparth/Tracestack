import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import SignOutButton from "./sign-out-button";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-12 text-neutral-100">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between border-b border-neutral-800 pb-6">
          <a href="/" className="font-semibold tracking-wide text-cyan-400">TRACESTACK</a>
          <SignOutButton />
        </header>
        <section className="py-12">
          <p className="text-sm font-medium uppercase tracking-widest text-cyan-400">Authenticated session</p>
          <h1 className="mt-3 text-3xl font-semibold">Welcome to TraceStack</h1>
          <p className="mt-3 text-neutral-400">Signed in as {user.email ?? "your account"}.</p>
          <div className="mt-8 rounded-xl border border-neutral-800 bg-neutral-900 p-6">
            <h2 className="text-lg font-semibold">Authentication checkpoint</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-400">
              Supabase session verification is working on the server. Next we will validate access tokens in FastAPI
              and enforce per-user ownership for monitors, check results, and incidents.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
