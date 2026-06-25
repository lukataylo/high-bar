import { z } from "zod";

/**
 * Pre-engagement compliance attestation every expert must complete BEFORE being
 * matched to a question or joining a consultation. The fields encode the
 * controls that real expert networks enforce:
 *
 *  - Current/former employment & relationship to the subject company, with the
 *    "you may not consult about your current employer" rule and the finance /
 *    accounting cooling-off period (Guidepoint).
 *  - Employer-consent requirement for employed experts (GLG, Third Bridge).
 *  - Material non-public information (MNPI) / insider-information prohibition
 *    (GLG, Tegus, Third Bridge, SEC framing).
 *  - Confidentiality / NDA obligations to current or former employers / clients.
 *  - Conflicts of interest, including advising or consulting for the subject.
 *  - Regulated-role flags (public-company insider during a material corporate
 *    event, FDA advisory committee, clinical investigator, government official).
 *  - Biographical accuracy and recording-consent acknowledgements.
 *
 * The schema is intentionally explicit (no free-form booleans buried in text)
 * so that {@link evaluateCompliance} can fail CLOSED: engagement is blocked
 * unless every disqualifying condition is provably absent.
 */

export const RegulatedRole = z.enum([
  "none",
  "public_company_insider",
  "fda_advisory_committee",
  "clinical_investigator",
  "government_official",
  "board_member_of_subject",
]);
export type RegulatedRole = z.infer<typeof RegulatedRole>;

/** Minimum cooling-off period (months) for former finance/accounting staff. */
export const FINANCE_ACCOUNTING_COOLING_OFF_MONTHS = 4;

export const ComplianceAttestation = z.object({
  // ── Employment & relationship to the subject company ────────────────────
  /** Expert is a current employee/officer/director of the company being discussed. */
  currentlyEmployedBySubject: z.boolean(),
  /** Expert currently advises, consults for, or sits on the board of the subject. */
  advisesOrConsultsForSubject: z.boolean(),
  /** Expert held a finance or accounting role at the subject (triggers cooling-off). */
  heldFinanceOrAccountingRoleAtSubject: z.boolean(),
  /** Whole months since that finance/accounting role ended (0 if still employed). */
  monthsSinceFinanceAccountingRoleEnded: z.number().int().nonnegative(),

  // ── Employer consent (for employed experts) ─────────────────────────────
  /** Expert's current employer requires consent/approval to participate. */
  employerConsentRequired: z.boolean(),
  /** Expert has obtained that written employer consent. */
  employerConsentObtained: z.boolean(),

  // ── MNPI / insider information ──────────────────────────────────────────
  /** Expert currently holds material non-public information relevant to the topic. */
  holdsMaterialNonPublicInfo: z.boolean(),
  /** Affirmation: will not disclose any MNPI or insider information. Must be true. */
  affirmsNoMnpiDisclosure: z.boolean(),

  // ── Confidentiality / NDA ───────────────────────────────────────────────
  /** Bound by an NDA/confidentiality duty that would be breached by participating. */
  boundByNdaThatRestrictsTopic: z.boolean(),
  /** Affirmation: will honor all confidentiality obligations. Must be true. */
  affirmsConfidentialityHonored: z.boolean(),

  // ── Conflicts of interest ───────────────────────────────────────────────
  /** Any undisclosed conflict of interest with the client or subject. */
  hasUndisclosedConflictOfInterest: z.boolean(),

  // ── Regulated-industry / public-company flags ───────────────────────────
  /** The expert's special regulated role, if any. */
  regulatedRole: RegulatedRole,
  /** Subject is in a live material corporate event (tender offer, pending IPO, etc.). */
  subjectInMaterialCorporateEvent: z.boolean(),
  /** Expert's regulated role conflicts with this specific topic. */
  regulatedRoleConflictsWithTopic: z.boolean(),

  // ── Integrity acknowledgements ──────────────────────────────────────────
  /** Affirmation: all biographical information provided is accurate. Must be true. */
  affirmsBiographicalAccuracy: z.boolean(),
  /** Acknowledges the engagement may be recorded/monitored for compliance. Must be true. */
  acknowledgesRecordingAndMonitoring: z.boolean(),
});
export type ComplianceAttestation = z.infer<typeof ComplianceAttestation>;

/** Machine-readable reason codes for why engagement was blocked. */
export const ComplianceBlockReason = z.enum([
  "malformed_attestation",
  "currently_employed_by_subject",
  "advises_or_consults_for_subject",
  "finance_accounting_cooling_off_not_elapsed",
  "employer_consent_required_not_obtained",
  "holds_material_non_public_info",
  "mnpi_nondisclosure_not_affirmed",
  "bound_by_restrictive_nda",
  "confidentiality_not_affirmed",
  "undisclosed_conflict_of_interest",
  "subject_in_material_corporate_event",
  "regulated_role_conflicts_with_topic",
  "biographical_accuracy_not_affirmed",
  "recording_consent_not_given",
]);
export type ComplianceBlockReason = z.infer<typeof ComplianceBlockReason>;

export interface ComplianceResult {
  /** True only if no blocking reason was found. */
  readonly passed: boolean;
  /** All blocking reasons (empty iff `passed`). */
  readonly blockingReasons: readonly ComplianceBlockReason[];
}

/**
 * Evaluate a compliance attestation, FAIL-CLOSED.
 *
 * Accepts `unknown` and validates with zod first: a malformed or incomplete
 * attestation can never "pass". A clean attestation passes only when every
 * disqualifying condition is provably absent and every required affirmation is
 * present.
 */
export function evaluateCompliance(input: unknown): ComplianceResult {
  const parsed = ComplianceAttestation.safeParse(input);
  if (!parsed.success) {
    return { passed: false, blockingReasons: ["malformed_attestation"] };
  }
  const a = parsed.data;
  const reasons: ComplianceBlockReason[] = [];

  // Hard disqualifiers — presence of any blocks engagement.
  if (a.currentlyEmployedBySubject) reasons.push("currently_employed_by_subject");
  if (a.advisesOrConsultsForSubject) reasons.push("advises_or_consults_for_subject");
  if (a.holdsMaterialNonPublicInfo) reasons.push("holds_material_non_public_info");
  if (a.boundByNdaThatRestrictsTopic) reasons.push("bound_by_restrictive_nda");
  if (a.hasUndisclosedConflictOfInterest) reasons.push("undisclosed_conflict_of_interest");
  if (a.subjectInMaterialCorporateEvent) reasons.push("subject_in_material_corporate_event");
  if (a.regulatedRoleConflictsWithTopic) reasons.push("regulated_role_conflicts_with_topic");

  // Required affirmations — absence of any blocks engagement.
  if (!a.affirmsNoMnpiDisclosure) reasons.push("mnpi_nondisclosure_not_affirmed");
  if (!a.affirmsConfidentialityHonored) reasons.push("confidentiality_not_affirmed");
  if (!a.affirmsBiographicalAccuracy) reasons.push("biographical_accuracy_not_affirmed");
  if (!a.acknowledgesRecordingAndMonitoring) reasons.push("recording_consent_not_given");

  // Conditional rules.
  if (a.employerConsentRequired && !a.employerConsentObtained) {
    reasons.push("employer_consent_required_not_obtained");
  }
  if (
    a.heldFinanceOrAccountingRoleAtSubject &&
    a.monthsSinceFinanceAccountingRoleEnded < FINANCE_ACCOUNTING_COOLING_OFF_MONTHS
  ) {
    reasons.push("finance_accounting_cooling_off_not_elapsed");
  }

  return { passed: reasons.length === 0, blockingReasons: reasons };
}

/**
 * Convenience predicate. Returns true ONLY when the attestation fully clears
 * compliance. Anything else (including malformed input) returns false.
 */
export function passed(input: unknown): boolean {
  return evaluateCompliance(input).passed;
}

/** A single human-facing attestation item, for rendering the intake checklist. */
export interface AttestationItem {
  readonly field: keyof ComplianceAttestation;
  readonly prompt: string;
  /**
   * The answer that would DISQUALIFY the expert, expressed for the operator/UI.
   * Conditional items note their dependency.
   */
  readonly disqualifyingAnswer: string;
}

/** Ordered checklist used to render the pre-engagement compliance intake. */
export const complianceChecklist: readonly AttestationItem[] = [
  {
    field: "currentlyEmployedBySubject",
    prompt:
      "Are you currently an employee, officer, or director of the company that is the subject of " +
      "this engagement (including its parent or subsidiaries)?",
    disqualifyingAnswer: "Yes",
  },
  {
    field: "advisesOrConsultsForSubject",
    prompt:
      "Do you currently advise, consult for, or sit on the board of the subject company?",
    disqualifyingAnswer: "Yes",
  },
  {
    field: "heldFinanceOrAccountingRoleAtSubject",
    prompt:
      "Did you hold a finance or accounting role at the subject company? If so, how many whole " +
      "months ago did that role end?",
    disqualifyingAnswer: `Yes, and it ended fewer than ${FINANCE_ACCOUNTING_COOLING_OFF_MONTHS} months ago`,
  },
  {
    field: "employerConsentRequired",
    prompt:
      "Does your current employer require consent or approval for you to participate? If so, have " +
      "you obtained written consent?",
    disqualifyingAnswer: "Consent required but not obtained",
  },
  {
    field: "holdsMaterialNonPublicInfo",
    prompt:
      "Do you currently possess any material non-public or insider information relevant to this " +
      "topic?",
    disqualifyingAnswer: "Yes",
  },
  {
    field: "affirmsNoMnpiDisclosure",
    prompt:
      "Do you affirm that you will NOT disclose any material non-public or insider information " +
      "during this engagement?",
    disqualifyingAnswer: "No / not affirmed",
  },
  {
    field: "boundByNdaThatRestrictsTopic",
    prompt:
      "Are you bound by any NDA or confidentiality obligation that this engagement would breach?",
    disqualifyingAnswer: "Yes",
  },
  {
    field: "affirmsConfidentialityHonored",
    prompt:
      "Do you affirm that you will honor all confidentiality obligations to current and former " +
      "employers and clients?",
    disqualifyingAnswer: "No / not affirmed",
  },
  {
    field: "hasUndisclosedConflictOfInterest",
    prompt:
      "Do you have any conflict of interest with the client or subject that you have not disclosed?",
    disqualifyingAnswer: "Yes",
  },
  {
    field: "subjectInMaterialCorporateEvent",
    prompt:
      "Is the subject company currently in a live material corporate event (e.g. tender offer, " +
      "pending IPO) for which you are an insider?",
    disqualifyingAnswer: "Yes",
  },
  {
    field: "regulatedRoleConflictsWithTopic",
    prompt:
      "If you hold a regulated role (e.g. FDA advisory committee, clinical investigator, government " +
      "official), does it conflict with this specific topic?",
    disqualifyingAnswer: "Yes",
  },
  {
    field: "affirmsBiographicalAccuracy",
    prompt: "Do you affirm that all biographical information you have provided is accurate?",
    disqualifyingAnswer: "No / not affirmed",
  },
  {
    field: "acknowledgesRecordingAndMonitoring",
    prompt:
      "Do you acknowledge that this engagement may be recorded and monitored for compliance?",
    disqualifyingAnswer: "No / not acknowledged",
  },
];
