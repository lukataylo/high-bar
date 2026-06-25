import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ACCOUNTS_API = "https://api.stripe.com/v1/accounts";
const ACCOUNT_LINKS_API = "https://api.stripe.com/v1/account_links";
const RETURN_URL = "https://highbar.dev/pwa";

interface StripeAccount {
  id: string;
}

interface StripeAccountLink {
  url: string;
}

interface StripeError {
  error?: { message?: string; type?: string };
}

async function stripePost<T>(
  url: string,
  secretKey: string,
  body: URLSearchParams
): Promise<{ ok: true; data: T } | { ok: false; message: string }> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: body.toString()
    });
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Stripe request failed" };
  }

  const json = (await response.json()) as T & StripeError;
  if (!response.ok || json.error) {
    return { ok: false, message: json.error?.message ?? `Stripe returned ${response.status}` };
  }
  return { ok: true, data: json };
}

async function buildOnboardResponse(email: string | null) {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    return {
      ok: true as const,
      live: false as const,
      note: "STRIPE_SECRET_KEY is not set on this deployment; returning a mock onboarding link.",
      accountId: null,
      onboardingUrl: RETURN_URL
    };
  }

  const accountBody = new URLSearchParams();
  accountBody.set("type", "express");
  accountBody.set("capabilities[transfers][requested]", "true");
  if (email) {
    accountBody.set("email", email);
  }

  const account = await stripePost<StripeAccount>(ACCOUNTS_API, secretKey, accountBody);
  if (!account.ok) {
    return {
      ok: true as const,
      live: false as const,
      note: `Stripe Connect account could not be created (${account.message}); returning a mock onboarding link.`,
      accountId: null,
      onboardingUrl: RETURN_URL
    };
  }

  const linkBody = new URLSearchParams();
  linkBody.set("account", account.data.id);
  linkBody.set("type", "account_onboarding");
  linkBody.set("refresh_url", RETURN_URL);
  linkBody.set("return_url", RETURN_URL);

  const link = await stripePost<StripeAccountLink>(ACCOUNT_LINKS_API, secretKey, linkBody);
  if (!link.ok) {
    return {
      ok: true as const,
      live: false as const,
      note: `Stripe onboarding link could not be created (${link.message}).`,
      accountId: account.data.id,
      onboardingUrl: RETURN_URL
    };
  }

  return {
    ok: true as const,
    live: true as const,
    accountId: account.data.id,
    onboardingUrl: link.data.url
  };
}

function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") {
    return null;
  }
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const payload = await buildOnboardResponse(normalizeEmail(url.searchParams.get("email")));
  return NextResponse.json(payload, noStore());
}

export async function POST(request: Request) {
  let email: string | null = null;
  try {
    const body = await request.json();
    if (body && typeof body === "object") {
      email = normalizeEmail((body as Record<string, unknown>).email);
    }
  } catch {
    email = null;
  }

  const payload = await buildOnboardResponse(email);
  return NextResponse.json(payload, noStore());
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
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
