import { NextResponse } from "next/server";
import { fetchBackend } from "@/lib/backend-api";
export async function POST() {
  try {
    const response = await fetchBackend("/api/v1/notifications/read-all", { method: "POST" });
    if (response.status === 204) return new Response(null, { status: 204 });
    const body = await response.json().catch(() => ({}));
    return NextResponse.json(body, { status: response.status });
  } catch (error) {
    console.error("TraceStack notification read-all proxy failed:", error);
    return NextResponse.json({ detail: "Could not update notifications." }, { status: 503 });
  }
}