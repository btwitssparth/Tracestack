"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  BellRing,
  Eye,
  EyeOff,
  LineChart,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Logo, Wordmark } from "@/components/brand";
import { Button, Spinner } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { InlineAlert } from "@/components/ui/feedback";

type AuthMode = "login" | "signup";

const capabilities = [
  { icon: Activity, title: "Uptime monitoring", body: "Scheduled checks record every result for your endpoints." },
  { icon: TriangleAlert, title: "Incident detection", body: "Consecutive failures open an incident; recoveries close it." },
  { icon: LineChart, title: "Performance history", body: "Response times and check outcomes in one place." },
  { icon: BellRing, title: "Notifications", body: "In-app alerts, with optional browser push where supported." },
];

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [provider, setProvider] = useState<"google" | "github" | null>(null);

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

  async function handleSocialAuth(nextProvider: "google" | "github") {
    setBusy(true);
    setProvider(nextProvider);
    setMessage("");

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: nextProvider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Social sign-in failed. Please try again.");
      setBusy(false);
      setProvider(null);
    }
  }

  function switchMode() {
    setMode(mode === "login" ? "signup" : "login");
    setMessage("");
  }

  return (
    <div className="grid min-h-screen bg-canvas lg:grid-cols-[1.05fr_1fr]">
      {/* Brand / context panel */}
      <aside className="relative hidden flex-col justify-between border-r border-line bg-nav p-10 lg:flex xl:p-14">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <Logo className="h-8 w-8" />
          <Wordmark />
        </Link>

        <div className="max-w-md">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
            Website and API monitoring
          </p>
          <h2 className="mt-3 text-[28px] font-semibold leading-tight tracking-[-0.03em] text-ink xl:text-[32px]">
            Know when your services go down — before your users tell you.
          </h2>
          <p className="mt-4 text-[13px] leading-6 text-muted">
            TraceStack keeps uptime, incidents, and response-time history in one calm, focused
            workspace built for engineering teams.
          </p>

          <ul className="mt-8 space-y-px overflow-hidden rounded-lg border border-line bg-panel">
            {capabilities.map((item) => (
              <li key={item.title} className="flex items-start gap-3 border-b border-line px-4 py-3.5 last:border-b-0">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] border border-line-strong bg-raised text-muted">
                  <item.icon className="h-3.5 w-3.5" />
                </span>
                <span>
                  <span className="block text-[13px] font-medium text-ink">{item.title}</span>
                  <span className="mt-0.5 block text-[12px] leading-5 text-faint">{item.body}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="flex items-center gap-2 text-[11px] text-faint">
          <ShieldCheck className="h-3.5 w-3.5 text-ok" />
          Authentication handled by Supabase Auth
        </p>
      </aside>

      {/* Auth form */}
      <main className="flex items-center justify-center px-5 py-10 sm:px-8">
        <section className="animate-rise w-full max-w-[400px]">
          <Link href="/" className="mb-8 inline-flex items-center gap-2.5 lg:hidden">
            <Logo className="h-8 w-8" />
            <Wordmark />
          </Link>

          <h1 className="text-[24px] font-semibold tracking-[-0.025em] text-ink">
            {mode === "login" ? "Sign in to TraceStack" : "Create your account"}
          </h1>
          <p className="mt-1.5 text-[13px] leading-6 text-muted">
            {mode === "login"
              ? "Access your monitors, incidents, and check history."
              : "Start monitoring your endpoints in a few minutes."}
          </p>

          <div className="mt-6 grid grid-cols-2 gap-2.5">
            <Button
              type="button"
              onClick={() => void handleSocialAuth("google")}
              disabled={busy}
              className="justify-center"
            >
              {busy && provider === "google" ? <Spinner className="h-3.5 w-3.5" /> : null}
              Continue with Google
            </Button>
            <Button
              type="button"
              onClick={() => void handleSocialAuth("github")}
              disabled={busy}
              className="justify-center"
            >
              {busy && provider === "github" ? <Spinner className="h-3.5 w-3.5" /> : null}
              Continue with GitHub
            </Button>
          </div>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-line" />
            <span className="text-[11px] uppercase tracking-[0.14em] text-faint">or continue with email</span>
            <span className="h-px flex-1 bg-line" />
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4">
            <Field label="Email address">
              <Input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
              />
            </Field>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-[13px] font-medium text-muted">
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  minLength={8}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 8 characters"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-[6px] text-faint transition-colors hover:bg-ink/[0.06] hover:text-ink"
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={busy && provider === null}
              className="w-full"
            >
              {busy && provider === null
                ? mode === "login"
                  ? "Signing in"
                  : "Creating account"
                : mode === "login"
                  ? "Sign in"
                  : "Create account"}
            </Button>
          </form>

          {message && (
            <InlineAlert
              tone="info"
              className={cn("mt-4")}
            >
              <span aria-live="polite" role="status">
                {message}
              </span>
            </InlineAlert>
          )}

          <p className="mt-6 text-center text-[13px] text-muted">
            {mode === "login" ? "New to TraceStack?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={switchMode}
              className="font-medium text-accent transition-colors hover:text-[#7aefd0]"
            >
              {mode === "login" ? "Create an account" : "Sign in"}
            </button>
          </p>

          <p className="mt-8 text-center text-[11px] text-faint">
            <Link href="/" className="transition-colors hover:text-muted">
              ← Back to home
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
}
