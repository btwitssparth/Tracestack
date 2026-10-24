import { NextResponse } from "next/server";

import { fetchBackend } from "@/lib/backend-api";

export async function GET(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const query = searchParams.toString();
    const path = query ? `/api/v1/incidents?${query}` : "/api/v1/incidents";
    const response = await fetchBackend(path);
    const body = await response.json().catch(() => ({
      detail: "Backend returned an invalid response",
    }));

    return NextResponse.json(body, { status: response.status });
  } catch (error) {
    console.error("TraceStack incidents proxy failed:", error);
    return NextResponse.json(
      { detail: "Monitoring API is unavailable. Check TRACESTACK_API_URL." },
      { status: 503 },
    );
  }
}
