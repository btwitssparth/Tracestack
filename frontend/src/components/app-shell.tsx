"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  ExternalLink,
  LayoutDashboard,
  LineChart,
  Menu as MenuIcon,
  ShieldCheck,
  TriangleAlert,
  X,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Logo, Wordmark } from "@/components/brand";
import { NotificationMenu } from "@/components/notification-menu";
import { UserMenu } from "@/components/user-menu";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  isActive: (pathname: string) => boolean;
};

const monitorNav: NavItem[] = [
  {
    label: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
    isActive: (p) => p === "/dashboard",
  },
  {
    label: "Monitors",
    href: "/dashboard#monitors",
    icon: Activity,
    isActive: (p) => p.startsWith("/dashboard/monitors"),
  },
  {
    label: "Incidents",
    href: "/dashboard#incidents",
    icon: TriangleAlert,
    isActive: () => false,
  },
];

const analyzeNav: NavItem[] = [
  {
    label: "Analytics",
    href: "/dashboard/analytics",
    icon: LineChart,
    isActive: (p) => p.startsWith("/dashboard/analytics"),
  },
];

function pageContext(pathname: string) {
  if (pathname.startsWith("/dashboard/monitors/")) {
    return { section: "Monitors", title: "Monitor details" };
  }
  if (pathname.startsWith("/dashboard/analytics")) {
    return { section: "Analysis", title: "Analytics" };
  }
  return { section: "Workspace", title: "Overview" };
}

function NavLink({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate?: () => void }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex items-center gap-2.5 px-4 py-2 text-[13px] font-medium transition-colors",
        active ? "bg-accent/[0.07] text-accent" : "text-muted hover:bg-ink/[0.04] hover:text-ink",
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-r bg-accent" aria-hidden="true" />
      )}
      <Icon className="h-4 w-4 shrink-0" strokeWidth={active ? 2.3 : 2} />
      {item.label}
    </Link>
  );
}

function SidebarBody({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <>
      <div className="flex items-center gap-2.5 px-4 pt-5">
        <Logo className="h-8 w-8" />
        <span className="flex min-w-0 flex-col">
          <Wordmark className="truncate" />
          <span className="text-[10.5px] uppercase tracking-[0.16em] text-faint">Monitoring console</span>
        </span>
      </div>

      <nav className="mt-6 flex flex-col" aria-label="Primary">
        <p className="px-4 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-faint">
          Monitoring
        </p>
        {monitorNav.map((item) => (
          <NavLink key={item.label} item={item} active={item.isActive(pathname)} onNavigate={onNavigate} />
        ))}

        <p className="px-4 pb-1.5 pt-5 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-faint">
          Analysis
        </p>
        {analyzeNav.map((item) => (
          <NavLink key={item.label} item={item} active={item.isActive(pathname)} onNavigate={onNavigate} />
        ))}
      </nav>

      <div className="mt-auto space-y-2 p-4">
        <div className="rounded-lg border border-line bg-panel/70 p-3">
          <p className="flex items-center gap-2 text-[12px] font-medium text-muted">
            <ShieldCheck className="h-3.5 w-3.5 text-ok" />
            Session secured
          </p>
          <p className="mt-1 text-[11px] leading-4 text-faint">
            Monitoring data is fetched through your authenticated Supabase session.
          </p>
        </div>
        <a
          href="https://github.com/btwitssparth/Tracestack"
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between rounded-md px-1 py-1 text-[11px] text-faint transition-colors hover:text-muted"
        >
          TraceStack on GitHub
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </>
  );
}

export function AppShell({ email, children }: { email: string; children: ReactNode }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const context = pageContext(pathname);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setDrawerOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  return (
    <div className="min-h-screen bg-canvas">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[236px] flex-col border-r border-line bg-nav lg:flex">
        <SidebarBody pathname={pathname} />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="animate-fade absolute inset-0 bg-[#050d0c]/80"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="animate-rise absolute inset-y-0 left-0 flex w-[264px] flex-col border-r border-line-strong bg-nav">
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close navigation"
              className="absolute right-3 top-4 flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-ink/[0.06] hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
            <SidebarBody pathname={pathname} onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}

      <div className="lg:pl-[236px]">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-line bg-canvas px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation"
              className="flex h-9 w-9 items-center justify-center rounded-md border border-line text-muted transition-colors hover:border-line-strong hover:text-ink lg:hidden"
            >
              <MenuIcon className="h-4 w-4" />
            </button>
            <div className="flex min-w-0 items-center gap-2 text-[13px]">
              <span className="hidden text-faint sm:inline">{context.section}</span>
              <span className="hidden text-line-strong sm:inline" aria-hidden="true">/</span>
              <span className="truncate font-medium text-ink">{context.title}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <NotificationMenu />
            <span className="mx-0.5 hidden h-6 w-px bg-line sm:block" aria-hidden="true" />
            <UserMenu email={email} />
          </div>
        </header>

        <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
