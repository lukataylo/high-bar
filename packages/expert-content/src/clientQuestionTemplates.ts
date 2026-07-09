import { Domain } from "@high-bar/core";
import { defineTemplate } from "./templating";
import type { QuestionTemplate } from "./templating";

/**
 * Catalog of client-submitted research questions, keyed off the core `Domain`
 * enum. Phrasing follows the conventions of established expert networks: each
 * brief states the decision being made, asks for firsthand opinion / historical
 * context, names the comparators of interest, and stays clear of any request
 * for confidential or material non-public information.
 */
export const clientQuestionTemplates: readonly QuestionTemplate[] = [
  // ── software_engineering ────────────────────────────────────────────────
  defineTemplate({
    id: "swe.platform_diligence",
    domain: Domain.enum.software_engineering,
    title: "Engineering org & platform diligence",
    style: "diligence",
    prompt:
      "We are conducting technical diligence on {{company}} ahead of a potential {{deal_type}}. " +
      "Based on your firsthand experience, how would you assess the maturity of their " +
      "{{system_area}} architecture, their key technical risks, and how their engineering " +
      "velocity compares to peers such as {{comparators}}? Please ground your view in what you " +
      "personally observed and avoid any confidential or non-public details.",
  }),
  defineTemplate({
    id: "swe.build_vs_buy",
    domain: Domain.enum.software_engineering,
    title: "Build-vs-buy for a platform capability",
    style: "best_practices",
    prompt:
      "For teams of roughly {{team_size}} engineers building {{capability}}, what does a strong " +
      "build-vs-buy decision look like in {{timeframe}}? Where have you seen teams over-invest, " +
      "and which tooling ({{tooling_examples}}) actually moved the needle?",
  }),

  // ── business_leadership ─────────────────────────────────────────────────
  defineTemplate({
    id: "biz.scaling_playbook",
    domain: Domain.enum.business_leadership,
    title: "Scaling playbook for a growth-stage company",
    style: "best_practices",
    prompt:
      "Drawing on your experience leading {{function}} at companies scaling from {{stage_from}} " +
      "to {{stage_to}}, what organizational and operating changes were most decisive, and what " +
      "would you warn a leadership team at {{company}} to avoid?",
  }),
  defineTemplate({
    id: "biz.market_entry",
    domain: Domain.enum.business_leadership,
    title: "Market-entry strategy assessment",
    style: "market_landscape",
    prompt:
      "How attractive is the {{market}} market in {{region}} for a new entrant over the next " +
      "{{timeframe}}? Please cover the competitive structure, the main barriers to entry, and " +
      "how incumbents such as {{comparators}} are likely to respond.",
  }),

  // ── insurance ───────────────────────────────────────────────────────────
  defineTemplate({
    id: "ins.underwriting_trends",
    domain: Domain.enum.insurance,
    title: "Underwriting & pricing trend read",
    style: "market_landscape",
    prompt:
      "From your firsthand vantage point in {{line_of_business}} underwriting, how have pricing, " +
      "loss ratios, and capacity shifted in {{region}} over {{timeframe}}, and what is driving " +
      "the change? How do carriers like {{comparators}} differ in appetite?",
  }),
  defineTemplate({
    id: "ins.claims_operations",
    domain: Domain.enum.insurance,
    title: "Claims operations & technology diligence",
    style: "diligence",
    prompt:
      "We are evaluating {{company}}'s claims operation. Based on your direct experience, how " +
      "efficient is their {{claims_area}} process relative to peers, where are the bottlenecks, " +
      "and how mature is their adoption of {{technology}}?",
  }),

  // ── legal ───────────────────────────────────────────────────────────────
  defineTemplate({
    id: "legal.regulatory_landscape",
    domain: Domain.enum.legal,
    title: "Regulatory landscape & enforcement read",
    style: "market_landscape",
    prompt:
      "How is the regulatory and enforcement environment for {{regulatory_topic}} in {{region}} " +
      "evolving over {{timeframe}}? Please speak only to publicly known frameworks and your " +
      "general professional interpretation — not to any privileged or client-confidential matter.",
  }),
  defineTemplate({
    id: "legal.contracting_norms",
    domain: Domain.enum.legal,
    title: "Commercial contracting norms",
    style: "best_practices",
    prompt:
      "What are the prevailing market norms for {{contract_type}} terms (e.g. {{key_terms}}) " +
      "between {{counterparty_types}}, and where do you most often see negotiation friction?",
  }),

  // ── finance ─────────────────────────────────────────────────────────────
  defineTemplate({
    id: "fin.industry_kpis",
    domain: Domain.enum.finance,
    title: "Industry unit economics & KPIs",
    style: "diligence",
    prompt:
      "For a business like {{company}} in {{sub_sector}}, which unit-economics and KPI drivers " +
      "matter most, what does best-in-class look like for {{key_metric}}, and how should we " +
      "think about the durability of margins over {{timeframe}}? Please rely on industry " +
      "knowledge, not any non-public financials.",
  }),
  defineTemplate({
    id: "fin.competitive_moats",
    domain: Domain.enum.finance,
    title: "Competitive moat & switching-cost read",
    style: "market_landscape",
    prompt:
      "How defensible is {{company}}'s position in {{market}} versus {{comparators}}? Where do " +
      "switching costs, distribution, or regulation create real moats, and where are they thinner " +
      "than the market assumes?",
  }),

  // ── healthcare ──────────────────────────────────────────────────────────
  defineTemplate({
    id: "hc.treatment_adoption",
    domain: Domain.enum.healthcare,
    title: "Treatment / product adoption dynamics",
    style: "market_landscape",
    prompt:
      "As a practitioner in {{specialty}}, how is adoption of {{product_or_treatment}} trending " +
      "among peers in {{region}}, what drives prescribing or purchasing decisions, and how does it " +
      "compare to {{comparators}}? Please share only your general clinical perspective — no " +
      "patient-identifiable data and no non-public trial results.",
  }),
  defineTemplate({
    id: "hc.provider_purchasing",
    domain: Domain.enum.healthcare,
    title: "Provider purchasing & reimbursement",
    style: "vendor_evaluation",
    prompt:
      "Within a {{provider_setting}}, how are purchasing and reimbursement decisions made for " +
      "{{category}}, who holds budget authority, and what would make a buyer switch away from " +
      "an incumbent like {{incumbent}}?",
  }),

  // ── marketing ───────────────────────────────────────────────────────────
  defineTemplate({
    id: "mkt.channel_effectiveness",
    domain: Domain.enum.marketing,
    title: "Channel mix & CAC effectiveness",
    style: "best_practices",
    prompt:
      "For {{company_type}} targeting {{audience}}, which acquisition channels are actually " +
      "working in {{timeframe}}, how have CAC and payback shifted, and where have you seen budget " +
      "wasted? Please reference your direct, hands-on experience.",
  }),
  defineTemplate({
    id: "mkt.brand_positioning",
    domain: Domain.enum.marketing,
    title: "Brand positioning vs. competitors",
    style: "market_landscape",
    prompt:
      "How is {{company}}'s brand and messaging perceived relative to {{comparators}} among " +
      "{{audience}}, and where is there room to reposition in the {{market}} category?",
  }),

  // ── sales ───────────────────────────────────────────────────────────────
  defineTemplate({
    id: "sales.buying_process",
    domain: Domain.enum.sales,
    title: "Buyer decision process & sales cycle",
    style: "vendor_evaluation",
    prompt:
      "Walk us through the typical buying process for {{product_category}} among {{buyer_persona}}: " +
      "who is in the room, how long the cycle runs, what triggers a purchase, and how vendors like " +
      "{{comparators}} win or lose deals. Please base this on deals you were personally involved in.",
  }),
  defineTemplate({
    id: "sales.gtm_motion",
    domain: Domain.enum.sales,
    title: "Go-to-market motion benchmarking",
    style: "best_practices",
    prompt:
      "For selling {{product_category}} into {{segment}}, what go-to-market motion (e.g. " +
      "{{motion_examples}}) has worked best, what does productive rep ramp and quota attainment " +
      "look like, and where do teams most often stall?",
  }),

  // ── data_ai ─────────────────────────────────────────────────────────────
  defineTemplate({
    id: "ai.production_readiness",
    domain: Domain.enum.data_ai,
    title: "AI/ML production-readiness assessment",
    style: "technical_deep_dive",
    prompt:
      "Based on your hands-on experience deploying {{model_type}} systems in production, what does " +
      "a credible {{use_case}} deployment require in terms of data, evaluation, and guardrails, and " +
      "what are the most common reasons these projects fail to reach reliable production quality?",
  }),
  defineTemplate({
    id: "ai.vendor_landscape",
    domain: Domain.enum.data_ai,
    title: "Data/AI tooling & vendor landscape",
    style: "vendor_evaluation",
    prompt:
      "How would you map the vendor landscape for {{capability}} (e.g. {{tooling_examples}}) for a " +
      "team of {{team_size}}, what are the real trade-offs you have observed, and where is the hype " +
      "ahead of the reality?",
  }),

  // ── operations ──────────────────────────────────────────────────────────
  defineTemplate({
    id: "ops.supply_chain_diligence",
    domain: Domain.enum.operations,
    title: "Supply chain & operations diligence",
    style: "diligence",
    prompt:
      "We are assessing {{company}}'s {{operation_area}} operations. From your firsthand " +
      "experience, where are the structural cost and reliability risks, how do their lead times and " +
      "supplier relationships compare to peers such as {{comparators}}, and what would you fix first?",
  }),
  defineTemplate({
    id: "ops.process_benchmarking",
    domain: Domain.enum.operations,
    title: "Process efficiency benchmarking",
    style: "best_practices",
    prompt:
      "For a {{facility_type}} running {{process}}, what do best-in-class throughput, quality, and " +
      "cost metrics look like in {{timeframe}}, and which operational levers deliver the biggest " +
      "improvement first?",
  }),
];

/** Templates available for a given domain. */
export function templatesForDomain(domain: Domain): QuestionTemplate[] {
  return clientQuestionTemplates.filter((t) => t.domain === domain);
}

/** Look up a single template by id. */
export function getTemplate(id: string): QuestionTemplate | undefined {
  return clientQuestionTemplates.find((t) => t.id === id);
}
