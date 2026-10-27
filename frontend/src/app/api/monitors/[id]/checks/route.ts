import { NextResponse } from "next/server";

import { fetchBackend } from "@/lib/backend-api";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!/^\d+$/.test(id)) {
      return NextResponse.json({ detail: "Invalid monitor ID." }, { status: 400 });
    }

    const search = new URL(request.url).searchParams.toString();
    const response = await fetchBackend(
      `/api/v1/monitors/${id}/checks${search ? `?${search}` : ""}`,
    );
    const body = await response.json().catch(() => ({
      detail: "Backend returned an invalid response",
    }));

    return NextResponse.json(body, { status: response.status });
  } catch (error) {
    console.error("TraceStack check history proxy failed:", error);
    return NextResponse.json(
      { detail: "Check history is unavailable. Check TRACESTACK_API_URL." },
      { status: 503 },
    );
  }
}
