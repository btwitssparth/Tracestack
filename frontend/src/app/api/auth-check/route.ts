import { NextResponse } from "next/server";

import { fetchBackend } from "@/lib/backend-api";

/**
 * Diagnostic endpoint used to verify that the signed-in Supabase session
 * is accepted by FastAPI. It returns only response status/body, never tokens.
 */
export async function GET() {
  const response = await fetchBackend("/api/v1/monitors");
  const body = await response.json().catch(() => ({
    detail: "Backend returned an invalid response",
  }));

  return NextResponse.json(
    {
      authenticatedRequest: response.ok,
      backendStatus: response.status,
      result: body,
    },
    { status: response.status },
  );
}
