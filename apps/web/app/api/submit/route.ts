import { NextResponse } from "next/server";
import { buildAskResponse, normalizeQuestion } from "@/lib/ask";

export const dynamic = "force-dynamic";

const STRIPE_API = "https://api.stripe.com/v1/payment_intents";

// Escrow amount (cents) by inferred domain/need. Clamped to 28000-60000.
const DOMAIN_AMOUNTS: Record<string, number> = {
  "agent debugging": 60000,
  "support operations": 32000,
  billing: 45000,
  policy: 52000,
  workflow: 28000
};

type AskResponse = ReturnType<typeof buildAskResponse>;

function deriveAmountCents(needs: string[]): number {
  const amounts = needs
    .map((need) => DOMAIN_AMOUNTS[need])
    .filter((value): value is number => typeof value === "number");
  const top = amounts.length > 0 ? Math.max(...amounts) : 40000;
  return Math.min(60000, Math.max(28000, top));
}

interface StripePaymentIntent {
  id: string;
  client_secret: string | null;
  status: string;
}

interface StripeError {
  error?: { message?: string; type?: string };
}

async function createEscrowIntent(
  secretKey: string,
  params: { amountCents: number; question: string; questionId: string; idempotencyKey: string }
): Promise<{ ok: true; intent: StripePaymentIntent } | { ok: false; message: string }> {
  const body = new URLSearchParams();
  body.set("amount", String(params.amountCents));
  body.set("currency", "usd");
  body.set("capture_method", "manual");
  body.set("payment_method_types[]", "card");
  body.set("description", `High Bar escrow hold for ${params.questionId}`);
  body.set("metadata[question]", params.question);
  body.set("metadata[questionId]", params.questionId);
  body.set("metadata[source]", "agent-submit");

  let response: Response;
  try {
    response = await fetch(STRIPE_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Idempotency-Key": params.idempotencyKey
      },
      body: body.toString()
    });
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Stripe request failed" };
  }

  const json = (await response.json()) as StripePaymentIntent & StripeError;
  if (!response.ok || json.error) {
    return { ok: false, message: json.error?.message ?? `Stripe returned ${response.status}` };
  }
  return { ok: true, intent: json };
}

async function buildSubmitResponse(input: {
  question: string;
  context: string;
  requester: string;
}) {
  const ask: AskResponse = buildAskResponse({
    question: input.question,
    context: input.context,
    requester: input.requester
  });

  const amountCents = deriveAmountCents(ask.route.needs);
  const secretKey = process.env.STRIPE_SECRET_KEY;

  const baseRoute = { topExperts: ask.route.topExperts, needs: ask.route.needs };

  if (!secretKey) {
    return {
      ok: true as const,
      escrow: false as const,
      note: "STRIPE_SECRET_KEY is not set on this deployment; returning mock routing without a real escrow hold.",
      questionId: ask.questionId,
      status: "queued_for_human_expert",
      question: input.question,
      requester: ask.requester,
      amountCents,
      currency: "usd",
      route: baseRoute,
      expertRequest: ask.expertRequest
    };
  }

  const result = await createEscrowIntent(secretKey, {
    amountCents,
    question: input.question,
    questionId: ask.questionId,
    idempotencyKey: `submit_${ask.questionId}_${amountCents}`
  });

  if (!result.ok) {
    return {
      ok: true as const,
      escrow: false as const,
      note: `Stripe escrow hold could not be created (${result.message}); returning mock routing instead.`,
      questionId: ask.questionId,
      status: "queued_for_human_expert",
      question: input.question,
      requester: ask.requester,
      amountCents,
      currency: "usd",
      route: baseRoute,
      expertRequest: ask.expertRequest
    };
  }

  return {
    ok: true as const,
    escrow: true as const,
    questionId: ask.questionId,
    status: "escrow_held",
    question: input.question,
    requester: ask.requester,
    amountCents,
    currency: "usd",
    paymentIntentId: result.intent.id,
    clientSecret: result.intent.client_secret,
    route: baseRoute,
    expertRequest: ask.expertRequest,
    stripeDashboardHint: `View this hold at https://dashboard.stripe.com/test/payments/${result.intent.id}`
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const question = normalizeQuestion(
    url.searchParams.get("question") ?? url.searchParams.get("q")
  );

  if (!question) {
    return NextResponse.json(instructions(url), noStore());
  }

  const payload = await buildSubmitResponse({
    question,
    context: normalizeQuestion(url.searchParams.get("context")),
    requester: normalizeQuestion(url.searchParams.get("requester")) || "External agent"
  });
  return NextResponse.json(payload, noStore());
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'POST JSON like { "question": "..." }.' },
      { status: 400, ...noStore() }
    );
  }

  const fields = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const question = normalizeQuestion(fields.question ?? fields.q);

  if (!question) {
    return NextResponse.json(
      { ok: false, error: 'Missing question. Send { "question": "..." }.' },
      { status: 400, ...noStore() }
    );
  }

  const payload = await buildSubmitResponse({
    question,
    context: normalizeQuestion(fields.context),
    requester: normalizeQuestion(fields.requester) || "External agent"
  });
  return NextResponse.json(payload, noStore());
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

function instructions(url: URL) {
  const endpoint = `${url.origin}${url.pathname}`;
  const exampleQuestion = "Why is my Claude Code tool call failing after an MCP schema change?";
  return {
    ok: true,
    name: "High Bar Agent Submit API",
    purpose:
      "Submit a question and place a real escrow PaymentIntent (manual capture) so funds are held until an expert answers.",
    usage: {
      get: `${endpoint}?question=YOUR_QUESTION`,
      post: { url: endpoint, json: { question: "YOUR_QUESTION", context: "optional context" } }
    },
    note: "Set STRIPE_SECRET_KEY (test mode) to create a real escrow hold; otherwise mock routing is returned.",
    exampleUrl: `${endpoint}?question=${encodeURIComponent(exampleQuestion)}`
  };
}

function noStore() {
  return { headers: { "Cache-Control": "no-store", ...corsHeaders() } };
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}
