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

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const response = await fetchBackend("/api/v1/monitors", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const body = await response.json().catch(() => ({
      detail: "Backend returned an invalid response",
    }));

    return NextResponse.json(body, { status: response.status });
  } catch (error) {
    console.error("TraceStack monitor creation proxy failed:", error);
    return NextResponse.json(
      { detail: "Could not create monitor. Check the API connection and try again." },
      { status: 503 },
    );
  }
}
