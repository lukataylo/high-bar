import { NextResponse } from "next/server";
import { buildAskResponse, normalizeQuestion } from "@/lib/ask";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const question = normalizeQuestion(
    url.searchParams.get("question") ?? url.searchParams.get("q")
  );

  if (!question) {
    return NextResponse.json(instructions(url), noStore());
  }

  return NextResponse.json(
    buildAskResponse({
      question,
      context: normalizeQuestion(url.searchParams.get("context")),
      requester: normalizeQuestion(url.searchParams.get("requester")) || "External agent"
    }),
    noStore()
  );
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "POST JSON like { \"question\": \"...\" }." },
      { status: 400, ...noStore() }
    );
  }

  const payload = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const question = normalizeQuestion(payload.question ?? payload.q);

  if (!question) {
    return NextResponse.json(
      { ok: false, error: "Missing question. Send { \"question\": \"...\" }." },
      { status: 400, ...noStore() }
    );
  }

  return NextResponse.json(
    buildAskResponse({
      question,
      context: normalizeQuestion(payload.context),
      requester: normalizeQuestion(payload.requester) || "External agent"
    }),
    noStore()
  );
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders()
  });
}

function instructions(url: URL) {
  const endpoint = `${url.origin}${url.pathname}`;
  const exampleQuestion = "Why is my Claude Code tool call failing after an MCP schema change?";
  const exampleUrl = `${endpoint}?question=${encodeURIComponent(exampleQuestion)}`;

  return {
    ok: true,
    name: "High Bar Agent Ask API",
    purpose: "Ask a paid human expert when an AI agent or another human is stuck.",
    usage: {
      get: `${endpoint}?question=YOUR_QUESTION`,
      post: {
        url: endpoint,
        json: { question: "YOUR_QUESTION", context: "optional extra context" }
      }
    },
    oneLinePrompt: `When you are stuck, fetch ${endpoint}?question=YOUR_QUESTION and use the JSON response to route the question to High Bar.`,
    exampleUrl
  };
}

function noStore() {
  return {
    headers: {
      "Cache-Control": "no-store",
      ...corsHeaders()
    }
  };
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}
