import { NextResponse } from "next/server";
import { getGuardrails } from "@/lib/config";
import { payoutQueue } from "@/lib/data";

export async function GET() {
  const guardrails = getGuardrails();

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
  });
}
