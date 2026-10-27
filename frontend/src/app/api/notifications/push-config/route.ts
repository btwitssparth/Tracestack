import { NextResponse } from "next/server";
import { fetchBackend } from "@/lib/backend-api";
export async function GET() {
  try {
    const response = await fetchBackend("/api/v1/notifications/push-config");
    const body = await response.json().catch(() => ({ detail: "Backend returned an invalid response" }));
    return NextResponse.json(body, { status: response.status });
  } catch (error) {
    console.error("TraceStack push config proxy failed:", error);
    return NextResponse.json({ detail: "Could not load push configuration." }, { status: 503 });
  }
}