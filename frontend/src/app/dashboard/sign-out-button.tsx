"use client";

import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button type="button" onClick={() => void signOut()}
      className="rounded-lg border border-neutral-700 px-4 py-2 text-sm hover:bg-neutral-900">
      Sign out
    </button>
  );
}
