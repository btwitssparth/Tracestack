import { NextResponse } from "next/server";
import { fetchBackend } from "@/lib/backend-api";
export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const response = await fetchBackend("/api/v1/notifications/push-subscriptions", { method: "POST", body: JSON.stringify(payload) });
    const body = await response.json().catch(() => ({}));
    return NextResponse.json(body, { status: response.status });
  } catch (error) {
    console.error("TraceStack push subscription proxy failed:", error);
    return NextResponse.json({ detail: "Could not save browser subscription." }, { status: 503 });
  }
}
export async function DELETE(request: Request) {
  try {
    const payload = await request.json();
    const response = await fetchBackend("/api/v1/notifications/push-subscriptions", { method: "DELETE", body: JSON.stringify(payload) });
    if (response.status === 204) return new Response(null, { status: 204 });
    const body = await response.json().catch(() => ({}));
    return NextResponse.json(body, { status: response.status });
  } catch (error) {
    console.error("TraceStack push subscription removal failed:", error);
    return NextResponse.json({ detail: "Could not remove browser subscription." }, { status: 503 });
  }
}