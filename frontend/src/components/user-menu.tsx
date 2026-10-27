"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, LogOut, ShieldCheck, UserRound } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Menu, MenuDivider, MenuItem, MenuLabel } from "@/components/ui/menu";
import { Spinner } from "@/components/ui/button";

export function UserMenu({ email }: { email: string }) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const initial = (email.trim()[0] || "T").toUpperCase();

  async function signOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <Menu
      panelClassName="w-64"
      trigger={({ open, toggle }) => (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-label="Account menu"
          className={`flex items-center gap-2 rounded-md border px-1.5 py-1.5 transition-colors ${
            open
              ? "border-line-strong bg-ink/[0.06]"
              : "border-line hover:border-line-strong hover:bg-ink/[0.03]"
          }`}
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-[6px] border border-accent/25 bg-accent/10 text-[11px] font-semibold text-accent">
            {initial}
          </span>
          <span className="hidden max-w-36 truncate text-[13px] text-muted sm:block">{email}</span>
        </button>
      )}
    >
      {({ close }) => (
        <>
          <MenuLabel>Signed in</MenuLabel>
          <div className="flex items-center gap-2.5 px-2.5 pb-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md border border-line-strong bg-raised text-muted">
              <UserRound className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13px] text-ink">{email}</span>
              <span className="block text-[11px] text-faint">Workspace member</span>
            </span>
          </div>
          <MenuDivider />
          <MenuItem
            icon={<ShieldCheck className="h-3.5 w-3.5" />}
            onClick={close}
            meta="Supabase"
          >
            Authenticated session
          </MenuItem>
          <MenuItem
            icon={<ExternalLink className="h-3.5 w-3.5" />}
            href="https://github.com/btwitssparth/Tracestack"
          >
            Source on GitHub
          </MenuItem>
          <MenuDivider />
          <MenuItem
            icon={signingOut ? <Spinner className="h-3.5 w-3.5" /> : <LogOut className="h-3.5 w-3.5" />}
            onClick={() => void signOut()}
            danger
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </MenuItem>
        </>
      )}
    </Menu>
  );
}
