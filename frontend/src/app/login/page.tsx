"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type AuthMode = "login" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "auth_callback") {
      setMessage("Sign-in could not be completed. Please try again.");
    }
  }, []);

  async function handleEmailAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      const supabase = createClient();

      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (error) throw error;

        if (!data.session) {
          setMessage("Account created. Check your email to verify your address before signing in.");
        } else {
          router.replace("/dashboard");
          router.refresh();
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace("/dashboard");
        router.refresh();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSocialAuth(provider: "google" | "github") {
    setBusy(true);
    setMessage("");

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Social sign-in failed. Please try again.");
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-5 py-12 text-neutral-100">
      <section className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-8 shadow-2xl">
        <a href="/" className="text-sm font-semibold tracking-wide text-cyan-400">TRACESTACK</a>
        <h1 className="mt-7 text-3xl font-semibold tracking-tight">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-neutral-400">
          {mode === "login"
            ? "Sign in to monitor your endpoints and investigate incidents."
            : "Create an account to start monitoring your endpoints."}
        </p>

        <div className="mt-7 grid grid-cols-2 gap-3">
          <button type="button" onClick={() => void handleSocialAuth("google")} disabled={busy}
            className="rounded-lg border border-neutral-700 px-3 py-3 text-sm font-medium hover:bg-neutral-800 disabled:opacity-50">
            Continue with Google
          </button>
          <button type="button" onClick={() => void handleSocialAuth("github")} disabled={busy}
            className="rounded-lg border border-neutral-700 px-3 py-3 text-sm font-medium hover:bg-neutral-800 disabled:opacity-50">
            Continue with GitHub
          </button>
        </div>

        <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-widest text-neutral-500">
          <span className="h-px flex-1 bg-neutral-800" />
          or continue with email
          <span className="h-px flex-1 bg-neutral-800" />
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-4">
          <label className="block text-sm text-neutral-300">
            Email address
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-3 text-neutral-100 outline-none focus:border-cyan-500"
              placeholder="you@example.com"
            />
          </label>
          <label className="block text-sm text-neutral-300">
            Password
            <input
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              minLength={8}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-3 text-neutral-100 outline-none focus:border-cyan-500"
              placeholder="At least 8 characters"
            />
          </label>
          <button type="submit" disabled={busy}
            className="w-full rounded-lg bg-cyan-400 px-4 py-3 font-semibold text-neutral-950 hover:bg-cyan-300 disabled:opacity-50">
            {busy ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>

        {message && (
          <p role="status" aria-live="polite" className="mt-4 rounded-lg border border-neutral-700 bg-neutral-950 p-3 text-sm text-neutral-300">
            {message}
          </p>
        )}

        <p className="mt-6 text-center text-sm text-neutral-400">
          {mode === "login" ? "New to TraceStack?" : "Already have an account?"}{" "}
          <button type="button" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMessage(""); }}
            className="font-semibold text-cyan-400 hover:text-cyan-300">
            {mode === "login" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </section>
    </main>
  );
}
