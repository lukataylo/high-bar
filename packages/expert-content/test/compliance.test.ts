import { describe, it, expect } from "vitest";
import {
  ComplianceAttestation,
  evaluateCompliance,
  passed,
  complianceChecklist,
  FINANCE_ACCOUNTING_COOLING_OFF_MONTHS,
} from "../src/index";
import type { ComplianceAttestation as Attestation } from "../src/index";

/** A clean attestation that should fully clear compliance. */
function cleanAttestation(): Attestation {
  return {
    currentlyEmployedBySubject: false,
    advisesOrConsultsForSubject: false,
    heldFinanceOrAccountingRoleAtSubject: false,
    monthsSinceFinanceAccountingRoleEnded: 0,
    employerConsentRequired: false,
    employerConsentObtained: false,
    holdsMaterialNonPublicInfo: false,
    affirmsNoMnpiDisclosure: true,
    boundByNdaThatRestrictsTopic: false,
    affirmsConfidentialityHonored: true,
    hasUndisclosedConflictOfInterest: false,
    regulatedRole: "none",
    subjectInMaterialCorporateEvent: false,
    regulatedRoleConflictsWithTopic: false,
    affirmsBiographicalAccuracy: true,
    acknowledgesRecordingAndMonitoring: true,
  };
}

describe("compliance — passes a clean attestation", () => {
  it("clears when no disqualifier is present", () => {
    const result = evaluateCompliance(cleanAttestation());
    expect(result.passed).toBe(true);
    expect(result.blockingReasons).toEqual([]);
    expect(passed(cleanAttestation())).toBe(true);
  });

  it("the clean fixture validates against the zod schema", () => {
    expect(ComplianceAttestation.safeParse(cleanAttestation()).success).toBe(true);
  });
});

describe("compliance — blocks on a disqualifying answer (fail-closed)", () => {
  it("blocks when the expert holds MNPI", () => {
    const result = evaluateCompliance({
      ...cleanAttestation(),
      holdsMaterialNonPublicInfo: true,
    });
    expect(result.passed).toBe(false);
    expect(result.blockingReasons).toContain("holds_material_non_public_info");
  });

  it("blocks when currently employed by the subject", () => {
    const result = evaluateCompliance({
      ...cleanAttestation(),
      currentlyEmployedBySubject: true,
    });
    expect(result.passed).toBe(false);
    expect(result.blockingReasons).toContain("currently_employed_by_subject");
  });

  it("blocks when the expert advises/consults for the subject", () => {
    expect(
      passed({ ...cleanAttestation(), advisesOrConsultsForSubject: true }),
    ).toBe(false);
  });

  it("blocks when the MNPI non-disclosure affirmation is missing", () => {
    const result = evaluateCompliance({
      ...cleanAttestation(),
      affirmsNoMnpiDisclosure: false,
    });
    expect(result.passed).toBe(false);
    expect(result.blockingReasons).toContain("mnpi_nondisclosure_not_affirmed");
  });

  it("blocks when bound by a restrictive NDA", () => {
    expect(
      passed({ ...cleanAttestation(), boundByNdaThatRestrictsTopic: true }),
    ).toBe(false);
  });

  it("blocks when employer consent is required but not obtained", () => {
    const result = evaluateCompliance({
      ...cleanAttestation(),
      employerConsentRequired: true,
      employerConsentObtained: false,
    });
    expect(result.blockingReasons).toContain(
      "employer_consent_required_not_obtained",
    );
    // ...and clears once consent is obtained.
    expect(
      passed({
        ...cleanAttestation(),
        employerConsentRequired: true,
        employerConsentObtained: true,
      }),
    ).toBe(true);
  });

  it("enforces the finance/accounting cooling-off period", () => {
    const tooSoon = evaluateCompliance({
      ...cleanAttestation(),
      heldFinanceOrAccountingRoleAtSubject: true,
      monthsSinceFinanceAccountingRoleEnded:
        FINANCE_ACCOUNTING_COOLING_OFF_MONTHS - 1,
    });
    expect(tooSoon.blockingReasons).toContain(
      "finance_accounting_cooling_off_not_elapsed",
    );
    expect(
      passed({
        ...cleanAttestation(),
        heldFinanceOrAccountingRoleAtSubject: true,
        monthsSinceFinanceAccountingRoleEnded:
          FINANCE_ACCOUNTING_COOLING_OFF_MONTHS,
      }),
    ).toBe(true);
  });

  it("aggregates multiple blocking reasons", () => {
    const result = evaluateCompliance({
      ...cleanAttestation(),
      holdsMaterialNonPublicInfo: true,
      hasUndisclosedConflictOfInterest: true,
      affirmsConfidentialityHonored: false,
    });
    expect(result.passed).toBe(false);
    expect(result.blockingReasons.length).toBeGreaterThanOrEqual(3);
  });
});

describe("compliance — fails closed on malformed input", () => {
  it("blocks undefined / empty / partial attestations", () => {
    expect(passed(undefined)).toBe(false);
    expect(passed({})).toBe(false);
    expect(evaluateCompliance({}).blockingReasons).toEqual([
      "malformed_attestation",
    ]);
    expect(
      passed({ ...cleanAttestation(), holdsMaterialNonPublicInfo: "no" }),
    ).toBe(false);
  });
});

describe("compliance checklist", () => {
  it("each checklist item maps to a real attestation field", () => {
    const shape = ComplianceAttestation.shape;
    for (const item of complianceChecklist) {
      expect(shape[item.field]).toBeDefined();
    }
  });
});
