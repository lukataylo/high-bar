import { describe, it, expect } from "vitest";
import {
  InMemoryQuestionService,
  QuestionNotFoundError,
} from "../service.js";
import {
  ListDomainsOutput,
  PricingOutput,
  SubmitQuestionOutput,
  QuestionStatusOutput,
} from "@high-bar/core/contracts";

describe("InMemoryQuestionService", () => {
  it("produces contract-valid output for every tool", async () => {
    const service = new InMemoryQuestionService();

    ListDomainsOutput.parse(await service.listDomains());
    PricingOutput.parse(await service.getPricing("legal"));

    const submitted = SubmitQuestionOutput.parse(
      await service.submitQuestion({
        domain: "legal",
        title: "Is this NDA enforceable?",
        body: "Counterparty added a perpetual non-compete clause across all jurisdictions.",
        askerType: "agent",
      }),
    );
    expect(submitted.status).toBe("awaiting_payment");
    expect(submitted.paymentClientSecret).toBeNull();

    const status = QuestionStatusOutput.parse(await service.getQuestionStatus(submitted.questionId));
    expect(status.questionId).toBe(submitted.questionId);
    expect(status.answer).toBeNull();
  });

  it("surfaces an answer once marked answered", async () => {
    const service = new InMemoryQuestionService();
    const submitted = await service.submitQuestion({
      domain: "finance",
      title: "How should we hedge FX exposure?",
      body: "We invoice in EUR but our cost base is USD; revenue is roughly 4M EUR a year.",
      askerType: "agent",
    });
    service.markAnswered(submitted.questionId, "Use a rolling forward contract ladder.");

    const status = QuestionStatusOutput.parse(await service.getQuestionStatus(submitted.questionId));
    expect(status.status).toBe("answered");
    expect(status.answer?.body).toContain("forward contract");
  });

  it("rejects an unknown question id", async () => {
    const service = new InMemoryQuestionService();
    await expect(
      service.getQuestionStatus("00000000-0000-0000-0000-000000000000"),
    ).rejects.toBeInstanceOf(QuestionNotFoundError);
  });
});
