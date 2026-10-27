import { NextResponse } from "next/server";
import { fetchBackend } from "@/lib/backend-api";
export async function GET(request: Request) {
  try {
    const search = new URL(request.url).searchParams.toString();
    const response = await fetchBackend(`/api/v1/notifications${search ? `?${search}` : ""}`);
    const body = await response.json().catch(() => ({ detail: "Backend returned an invalid response" }));
    return NextResponse.json(body, { status: response.status });
  } catch (error) {
    console.error("TraceStack notifications proxy failed:", error);
    return NextResponse.json({ detail: "Notifications are unavailable. Check TRACESTACK_API_URL." }, { status: 503 });
  }
}