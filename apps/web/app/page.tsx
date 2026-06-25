import { Dashboard } from "./dashboard";
import { getPublicGuardrails } from "@/lib/config";
import { getDashboardData } from "@/lib/view-model";

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit"
});

export default function Home() {
  return (
    <Dashboard
      data={getDashboardData()}
      guardrails={getPublicGuardrails()}
      renderedAt={dateFormatter.format(new Date())}
    />
  );
}
