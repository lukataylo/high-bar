# Expert Network Research — how the incumbents work, and how High Bar encodes it

> Purpose: ground the `@high-bar/expert-content` package in how real expert
> networks (GLG, AlphaSights, Guidepoint, Third Bridge, Tegus, Dialectica,
> Coleman) actually phrase client research requests, screen experts for
> relevance, and enforce compliance before a consultation. Each section ends
> with how High Bar encodes the pattern in code.

Expert networks sit between **clients** (investors, consultants, corporates — and,
for High Bar, AI agents) and **subject-matter experts**. The transaction is a
*paid conversation*: the client buys firsthand opinion, judgment, and historical
context. The entire business is regulated by one hard rule — **no material
non-public information (MNPI) and no breach of confidentiality** — so the
operational core is not matchmaking but **compliance gating**.

---

## 1. How clients phrase research requests / project briefs

Client questions are written in a **diligence / consulting register**: they name
the decision being made, ask for *firsthand opinion and historical context*
(explicitly **not** current non-public data), name the comparators of interest,
and bound the scope (geography, timeframe, segment).

Practitioner guidance and network FAQs converge on this structure:

- A project brief should list the **objectives and the specific questions the
  research must answer**, with the decision and urgency stated up front; the
  network's analyst then turns objectives into individual expert questions and
  may flag gaps. ([Brandspeak briefing template](https://brandspeak.co.uk/blog/how-to-brief-a-market-research-agency-plus-free-briefing-template/), [Asana design brief](https://asana.com/resources/design-brief))
- Networks coach clients to keep questions oriented toward **"opinion, analysis,
  and historical context, not current non-public data"** — the same framing the
  expert is reminded of at call open. ([IQ Network — Expert Network Compliance](https://iqnetwork.co/expert-network-compliance/))
- Typical asks are competitive landscape ("how does X compare to peers Y, Z"),
  buyer-process mapping ("walk us through the buying decision for product category
  P"), and unit-economics/KPI reads ("what does best-in-class look like for metric
  M"). ([Nexus — How expert calls work](https://nexusexpertresearch.co/blog/how-expert-calls-work-in-consulting-projects/), [How expert networks work — 2026 guide](https://iqnetwork.co/what-are-expert-networks-2025-guide/))

**High Bar encoding** — `src/clientQuestionTemplates.ts`: a catalog of
`QuestionTemplate`s keyed off the core `Domain` enum (every domain has ≥1
template). Each prompt is written in the diligence register, names comparators
via `{{placeholders}}`, and includes an explicit "no confidential / non-public
information" caveat. `defineTemplate()` derives the `variables` list from the
prompt so it can never drift; `renderTemplate()` fails closed
(`MissingTemplateVariablesError`) rather than ship a half-filled brief.

---

## 2. How networks screen experts for relevance (pre-call qualification)

Before an expert is shown to a client, the network runs a **short qualification**
— "a handful of questions, online or on a brief call, under ten minutes" — to
confirm the topic genuinely matches the expert's firsthand experience.

- Each assignment requires the expert to answer a small set of **screening /
  qualifying questions**; an associate then presents the answers and profile to
  the client, who selects whom to consult. ([proSapient Expert Hub](https://www.prosapient.com/expert-faqs), [Silverlight Research FAQ](https://www.silverlightresearch.com/expert-network-faq.html))
- Experts are coached to **"detail their firsthand experience with the companies
  the client wants to learn about"** and the recency of that experience — depth
  and recency are the two axes networks select on. ([Nexus — How expert calls work](https://nexusexpertresearch.co/blog/how-expert-calls-work-in-consulting-projects/), [Expert Network Calls — vetting criteria](https://expertnetworkcalls.com/94/how-to-choose-experts-wisely-vetting-criteria-for-high-stakes-calls))
- The screen also asks experts to **flag what they cannot speak to** — the first
  compliance signal, before formal attestation. ([IQ Network — Compliance](https://iqnetwork.co/expert-network-compliance/))

**High Bar encoding** — `src/expertScreeningQuestions.ts`: a
`universalScreeningQuestions` set (firsthand experience, role & period, recency,
named comparators, self-rated depth, and an explicit "what can't you speak to?"
limit), plus one focused `domainScreeningQuestions` entry per `Domain`.
`screeningQuestionsForDomain()` composes the two. Screening (relevance) is kept
deliberately **separate** from compliance (eligibility).

---

## 3. Compliance & oversight — the pre-engagement attestation

This is the core of how these networks operate compliantly. Across GLG,
Guidepoint, Third Bridge, and Tegus the same controls recur, and High Bar
encodes each one as a typed field with a fail-closed validator.

### 3.1 Confidentiality, MNPI / insider information
- Experts sign (and at GLG **annually re-sign**) terms agreeing they **will not
  provide confidential, including material non-public, information** and will keep
  client information confidential; GLG runs sector-specific annual training on
  what counts as confidential. ([GLG Compliance](https://glg.com/compliance))
- Third Bridge specialists **"must never disclose confidential information or
  non-public information regarding publicly quoted companies"** and are barred
  under securities laws from disclosing MNPI to clients. ([Third Bridge — Expert code of conduct](https://www.thirdbridge.com/en-us/about-us/compliance/policies/expert-code-of-conduct), [Third Bridge — Expert engagement & compliance terms](https://www.thirdbridge.com/en-us/about-us/compliance/policies/expert-engagement-and-compliance-terms-for-content-production-terms))
- Tegus requires experts to complete **insider-trading training and a pre-call
  compliance questionnaire**, and not to submit anything that breaches employer
  policy, NDAs, or SEC rules. ([Tegus Compliance](https://tegus.com/compliance))
- The SEC has repeatedly flagged adviser MNPI controls around expert networks,
  which is why the prohibition is treated as a hard gate. ([Morrison Foerster — SEC MNPI deficiencies](https://www.mofo.com/resources/insights/220502-sec-deficiencies-investment-adviser-mnpi-compliance-practices))

### 3.2 Employment status & employer consent
- **You may not consult about your current employer.** Guidepoint: "Employees
  (including officers and directors) may not consult about their current employer"
  — including parent and subsidiaries. ([Guidepoint — Summary of key rules](https://www.guidepoint.com/summary-of-key-rules/))
- Employed experts must have **employer consent** where their contract or policy
  requires it. GLG requires written employer consent for in-depth/ongoing work and
  maintains a database of employer-imposed restrictions; Third Bridge requires the
  expert to obtain "all necessary approvals … check with any relevant parties (such
  as your current or former employer)." ([GLG Compliance](https://glg.com/compliance), [Third Bridge — Expert code of conduct](https://www.thirdbridge.com/en-us/about-us/compliance/policies/expert-code-of-conduct))
- **Former finance/accounting staff** observe a cooling-off period — Guidepoint
  bars discussing a former employer for **four months** after leaving a finance or
  accounting role. ([Guidepoint — Summary of key rules](https://www.guidepoint.com/summary-of-key-rules/))

### 3.3 Conflicts of interest
- Guidepoint advisors must confirm participation presents **no conflict of
  interest** and would not breach any agreement with an employer, former employer,
  or entity they consult for; advisors **may not consult for a direct competitor of
  their employer**. ([Guidepoint — Terms & Conditions](https://www.guidepoint.com/guidepoint-global-advisors-terms-conditions/), [Guidepoint — Summary of key rules](https://www.guidepoint.com/summary-of-key-rules/))
- GLG uses tailored profile questions and millions of stored screening responses
  to identify and manage conflicts. ([GLG Compliance](https://glg.com/compliance))

### 3.4 Regulated-industry & public-company restrictions
- **Public company in a live corporate event:** an employee of a public-company
  target/bidder in a **tender offer**, or a private company that has **filed for
  IPO**, is prohibited from consulting until the event resolves. ([Guidepoint — Summary of key rules](https://www.guidepoint.com/summary-of-key-rules/))
- **Healthcare:** FDA Advisory Committee members can't consult on matters before
  their committee or involving MNPI they hold; clinical investigators can't discuss
  non-public patient data or undisclosed trial results; DSMB members can't discuss
  active trials. ([Guidepoint — Summary of key rules](https://www.guidepoint.com/summary-of-key-rules/))
- **Government:** networks screen public officials out of topics that conflict with
  their role. ([IQ Network — Compliance](https://iqnetwork.co/expert-network-compliance/))

### 3.5 Oversight mechanics
- Advisors must **affirm before each project** that they will conduct the
  consultation in conformity with the terms and **will not provide Confidential or
  MNPI**; networks maintain an **employer opt-out registry** and **record/monitor**
  calls for compliance with advance notice. ([Guidepoint — Terms & Conditions](https://www.guidepoint.com/guidepoint-global-advisors-terms-conditions/), [Tegus Compliance](https://tegus.com/compliance), [GLG Compliance](https://glg.com/compliance))

**High Bar encoding** — `src/complianceAttestations.ts`:

- `ComplianceAttestation` (zod) makes every control an explicit typed field —
  `currentlyEmployedBySubject`, `advisesOrConsultsForSubject`,
  `heldFinanceOrAccountingRoleAtSubject` + `monthsSinceFinanceAccountingRoleEnded`,
  `employerConsentRequired`/`employerConsentObtained`, `holdsMaterialNonPublicInfo`
  + `affirmsNoMnpiDisclosure`, `boundByNdaThatRestrictsTopic` +
  `affirmsConfidentialityHonored`, `hasUndisclosedConflictOfInterest`,
  `regulatedRole`, `subjectInMaterialCorporateEvent`,
  `regulatedRoleConflictsWithTopic`, plus biographical-accuracy and
  recording-consent acknowledgements.
- `evaluateCompliance(input: unknown)` is **fail-closed**:
  1. It `safeParse`s first — malformed/partial input returns
     `{ passed: false, blockingReasons: ["malformed_attestation"] }`.
  2. Any hard disqualifier present (employed by / advises the subject, holds
     MNPI, restrictive NDA, undisclosed conflict, live corporate event, regulated
     conflict) → blocked.
  3. Any required affirmation missing (MNPI non-disclosure, confidentiality,
     biographical accuracy, recording consent) → blocked.
  4. Conditional rules: employer consent required but not obtained → blocked;
     finance/accounting role ended < `FINANCE_ACCOUNTING_COOLING_OFF_MONTHS` (4)
     ago → blocked.
  5. `passed` is true **only** when `blockingReasons` is empty. The
     `passed(input)` predicate wraps this for call sites.
- `complianceChecklist` renders the human-facing intake questions, each tied to a
  real attestation field and its disqualifying answer.

`src/intake.ts#buildIntakePrompt()` assembles the full candidate-facing prompt:
rendered client question → relevance screening → compliance checklist, mirroring
the real-world flow (qualify for fit, then gate on compliance).

---

## Sources

- [GLG — Compliance](https://glg.com/compliance)
- [GLG — What a prospective expert witness should ask in a screening call](https://glg.com/articles/what-should-a-potential-expert-witness-ask-in-a-screening-call)
- [Guidepoint — Summary of key rules](https://www.guidepoint.com/summary-of-key-rules/)
- [Guidepoint — Global Advisors Terms & Conditions](https://www.guidepoint.com/guidepoint-global-advisors-terms-conditions/)
- [Guidepoint — Compliance overview](https://www.guidepoint.com/what-we-offer/compliance/)
- [Third Bridge — Expert code of conduct](https://www.thirdbridge.com/en-us/about-us/compliance/policies/expert-code-of-conduct)
- [Third Bridge — Expert engagement & compliance terms](https://www.thirdbridge.com/en-us/about-us/compliance/policies/expert-engagement-and-compliance-terms-for-content-production-terms)
- [Third Bridge — Expert terms and conditions](https://www.thirdbridge.com/en-us/about-us/compliance/policies/expert-terms-and-conditions)
- [Tegus — Compliance](https://tegus.com/compliance)
- [Tegus — Terms](https://tegus.com/terms)
- [AlphaSights — Experts](https://www.alphasights.com/experts/)
- [proSapient — Expert FAQs](https://www.prosapient.com/expert-faqs)
- [Silverlight Research — Expert network FAQ](https://www.silverlightresearch.com/expert-network-faq.html)
- [IQ Network — Expert network compliance: MNPI rules & best practices](https://iqnetwork.co/expert-network-compliance/)
- [IQ Network — What are expert networks (2026 guide)](https://iqnetwork.co/what-are-expert-networks-2025-guide/)
- [Nexus — How expert calls work in consulting projects](https://nexusexpertresearch.co/blog/how-expert-calls-work-in-consulting-projects/)
- [Nexus — Top expert network companies (2026)](https://nexusexpertresearch.co/blog/top-expert-network-companies/)
- [Expert Network Calls — vetting criteria for high-stakes calls](https://expertnetworkcalls.com/94/how-to-choose-experts-wisely-vetting-criteria-for-high-stakes-calls)
- [Inex One — Getting started with expert networks](https://inex.one/blog/getting-started-with-expert-networks)
- [Brandspeak — How to brief a market research agency](https://brandspeak.co.uk/blog/how-to-brief-a-market-research-agency-plus-free-briefing-template/)
- [Asana — How to write a design brief](https://asana.com/resources/design-brief)
- [Morrison Foerster — SEC flags deficiencies in adviser MNPI compliance](https://www.mofo.com/resources/insights/220502-sec-deficiencies-investment-adviser-mnpi-compliance-practices)
