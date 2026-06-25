import { Dashboard } from "./dashboard";
import { getGuardrails } from "@/lib/config";

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit"
});

export default function Home() {
  return (
    <Dashboard
      guardrails={getGuardrails()}
      renderedAt={dateFormatter.format(new Date())}
    />
  );
}
