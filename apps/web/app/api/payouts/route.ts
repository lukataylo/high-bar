import { NextResponse } from "next/server";
import { getPublicGuardrails } from "@/lib/config";
import { payoutQueue } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const guardrails = getPublicGuardrails();

  return NextResponse.json({
    guardrails,
    payouts: payoutQueue.map((payout) => ({
      ...payout,
      blockedByKillSwitch: guardrails.killSwitch,
      requiresApproval: payout.amountUsd >= guardrails.approvalThresholdUsd
    })),
    dailyRemainingUsd: Math.max(
      guardrails.dailyCapUsd -
        payoutQueue.reduce((total, payout) => total + payout.amountUsd, 0),
      0
    )
  }, {
    headers: { "Cache-Control": "no-store" }
  });
}
