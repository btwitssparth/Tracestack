import { NextResponse } from "next/server";

import { fetchBackend } from "@/lib/backend-api";

export async function GET() {
  try {
    const response = await fetchBackend("/api/v1/monitors");
    const body = await response.json().catch(() => ({
      detail: "Backend returned an invalid response",
    }));

    return NextResponse.json(body, { status: response.status });
  } catch (error) {
    console.error("TraceStack monitor proxy failed:", error);
    return NextResponse.json(
      { detail: "Monitoring API is unavailable. Check TRACESTACK_API_URL." },
      { status: 503 },
    );
  }
}
