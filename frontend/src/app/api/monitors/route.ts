import { NextResponse } from "next/server";

import { fetchBackend } from "@/lib/backend-api";

export async function GET() {
  const response = await fetchBackend("/api/v1/monitors");
  const body = await response.json().catch(() => ({
    detail: "Backend returned an invalid response",
  }));

  return NextResponse.json(body, { status: response.status });
}
