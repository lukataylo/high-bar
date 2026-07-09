import { Domain } from "@high-bar/core";

/**
 * Domain labels and price cards. Kept here (not imported from the mcp package's
 * private in-memory fake) so the REST surface and the agent surface share ONE
 * canonical pricing table backed by this app.
 */
export const DOMAIN_LABELS: Record<Domain, string> = {
  software_engineering: "Software Engineering",
  business_leadership: "Business Leadership",
  insurance: "Insurance",
  legal: "Legal",
  finance: "Finance",
  healthcare: "Healthcare",
  marketing: "Marketing",
  sales: "Sales",
  data_ai: "Data & AI",
  operations: "Operations",
};

export interface PriceCard {
  readonly priceCents: number;
  readonly slaHours: number;
}

export const PRICING: Record<Domain, PriceCard> = {
  software_engineering: { priceCents: 9900, slaHours: 48 },
  business_leadership: { priceCents: 14900, slaHours: 48 },
  insurance: { priceCents: 12900, slaHours: 72 },
  legal: { priceCents: 19900, slaHours: 72 },
  finance: { priceCents: 17900, slaHours: 48 },
  healthcare: { priceCents: 18900, slaHours: 72 },
  marketing: { priceCents: 8900, slaHours: 48 },
  sales: { priceCents: 8900, slaHours: 48 },
  data_ai: { priceCents: 11900, slaHours: 48 },
  operations: { priceCents: 9900, slaHours: 48 },
};

export function priceCardFor(domain: Domain): PriceCard {
  return PRICING[domain];
}
