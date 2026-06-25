import { NextResponse } from "next/server";
import { getAgentResponse } from "@/lib/view-model";

export const dynamic = "force-dynamic";

export async function GET() {
  const response = getAgentResponse();

  if (!response) {
    return NextResponse.json({ error: "No active request" }, { status: 404 });
  }

  return NextResponse.json(response, {
    headers: { "Cache-Control": "no-store" }
  });
}
