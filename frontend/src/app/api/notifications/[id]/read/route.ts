import { NextResponse } from "next/server";
import { fetchBackend } from "@/lib/backend-api";
export async function PATCH(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    if (!/^\d+$/.test(id)) return NextResponse.json({ detail: "Invalid notification ID" }, { status: 400 });
    const response = await fetchBackend(`/api/v1/notifications/${id}/read`, { method: "PATCH" });
    const body = await response.json().catch(() => ({ detail: "Backend returned an invalid response" }));
    return NextResponse.json(body, { status: response.status });
  } catch (error) {
    console.error("TraceStack notification read proxy failed:", error);
    return NextResponse.json({ detail: "Could not update notification." }, { status: 503 });
  }
}