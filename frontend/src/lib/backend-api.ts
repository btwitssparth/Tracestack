import { createClient } from "@/lib/supabase/server";

/**
 * Server-side API helper. The Supabase access token is read from the
 * authenticated server session and never exposed to client-side code.
 */
export async function fetchBackend(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const baseUrl = process.env.TRACESTACK_API_URL;
  if (!baseUrl) {
    throw new Error("TRACESTACK_API_URL is not configured.");
  }

  const supabase = await createClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.access_token) {
    return new Response(JSON.stringify({ detail: "Authentication required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${session.access_token}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return fetch(`${baseUrl.replace(/\/$/, "")}${normalizedPath}`, {
    ...init,
    headers,
    cache: "no-store",
  });
}
