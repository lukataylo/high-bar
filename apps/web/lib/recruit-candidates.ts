// Verified candidate experts for High Bar recruitment outreach.
//
// Every person in this list is a REAL, publicly verifiable individual found via
// public, ToS-safe sources (personal sites, company/leadership pages, conference
// and podcast bios, author pages, public faculty/encyclopedic pages). No
// LinkedIn scraping, no logged-in sources. Outreach drafts live in
// docs/EXPERT_RECRUITMENT.md and are sent MANUALLY by the founder after review —
// nothing here is auto-sent.
//
// `profileUrl` is a public source that was actually fetched/seen during research.
// Plain data module: no imports, strict types, no `any`.

export type RecruitCandidate = {
  name: string;
  role: string;
  company: string;
  domain: string;
  profileUrl: string;
  whyFit: string;
  confidence: "high" | "medium" | "low";
};

export const recruitCandidates: RecruitCandidate[] = [
  // ── Software engineering / AI ───────────────────────────────────────────
  {
    name: "Simon Willison",
    role: "Independent open-source developer; creator of Datasette, co-creator of Django",
    company: "Independent (Datasette / Simon Willison’s Weblog)",
    domain: "Software engineering / AI",
    profileUrl: "https://simonwillison.net/about/",
    whyFit:
      "Widely-followed independent practitioner whose blog is a go-to pragmatic reference on applying LLMs to real engineering — exactly the senior, opinionated operator who answers narrow technical questions well.",
    confidence: "high",
  },
  {
    name: "Gergely Orosz",
    role: "Author/publisher of The Pragmatic Engineer; ex-Uber, ex-Skype/Microsoft engineering manager",
    company: "Pragmatic Engineer BV",
    domain: "Software engineering / AI",
    profileUrl: "https://newsletter.pragmaticengineer.com/about",
    whyFit:
      "Runs the #1 software/AI engineering newsletter; a deeply networked senior engineer/manager whose entire product is rigorous, inside-knowledge answers on engineering practice, hiring, and tech orgs.",
    confidence: "high",
  },
  {
    name: "Eugene Yan",
    role: "Applied ML / LLM systems engineer (previously Principal Applied Scientist at Amazon)",
    company: "Anthropic",
    domain: "Software engineering / AI",
    profileUrl: "https://eugeneyan.com/about/",
    whyFit:
      "Hands-on applied scientist known for clear, practical ML/LLM-systems writing — ideal for implementation-grade questions on retrieval, ranking, and production LLM systems.",
    confidence: "high",
  },

  // ── Finance ─────────────────────────────────────────────────────────────
  {
    name: "Marc Rubinstein",
    role: "Author of Net Interest; Managing Partner, Fordington Advisors; former Lansdowne Partners PM",
    company: "Net Interest / Fordington Advisors",
    domain: "Finance",
    profileUrl: "https://www.netinterest.co/about",
    whyFit:
      "25+ year financials specialist (ex-hedge-fund PM, ex-Credit Suisse MD) who now consults financial firms and publishes deep analytical answers weekly — a natural paid-expert profile.",
    confidence: "high",
  },
  {
    name: "Aswath Damodaran",
    role: "Kerschner Family Chair Professor of Finance (the “Dean of Valuation”)",
    company: "NYU Stern School of Business",
    domain: "Finance",
    profileUrl: "https://pages.stern.nyu.edu/~adamodar/",
    whyFit:
      "The most recognized public authority on valuation, with a long track record of openly explaining valuation and investing questions to a broad audience.",
    confidence: "medium",
  },

  // ── Insurance / Insurtech ───────────────────────────────────────────────
  {
    name: "Matteo Carbone",
    role: "Founder & Director, IoT Insurance Observatory; insurtech investor/advisor (ex-Bain)",
    company: "IoT Insurance Observatory",
    domain: "Insurance",
    profileUrl: "https://future-of-insurance.com/podcast/matteocarbone/",
    whyFit:
      "Globally recognized insurtech strategist and advisor to 100+ insurance players; already monetizes expertise via advisory, so paid expert Q&A is a natural fit.",
    confidence: "high",
  },

  // ── Legal ───────────────────────────────────────────────────────────────
  {
    name: "Mark A. Cohen",
    role: "Founder & CEO, Legal Mosaic; Distinguished Lecturer at Georgetown Law; Forbes legal-industry columnist",
    company: "Legal Mosaic",
    domain: "Legal",
    profileUrl: "https://www.legalmosaic.com/",
    whyFit:
      "One of the most-cited commentators on the business of law; consults, teaches, and writes professionally — already monetizes expertise.",
    confidence: "high",
  },
  {
    name: "Mary Shen O'Carroll",
    role: "CEO, LegalEng Consulting Group (formerly Chief Community Officer at Ironclad; 13 yrs Director of Legal Operations at Google)",
    company: "LegalEng Consulting Group",
    domain: "Legal",
    profileUrl: "https://cloc.org/board/mary-shen-ocarroll/",
    whyFit:
      "Arguably the most recognized figure in legal operations, now running an advisory/consulting firm — exactly the senior operator who would answer paid expert questions.",
    confidence: "medium",
  },

  // ── Healthcare ──────────────────────────────────────────────────────────
  {
    name: "Sachin H. Jain",
    role: "President & CEO (physician-executive); Forbes contributor; Stanford adjunct professor",
    company: "SCAN Group & SCAN Health Plan",
    domain: "Healthcare",
    profileUrl: "https://www.scanhealthplan.com/about-scan/leadership/sachin-h-jain",
    whyFit:
      "A practicing physician-executive and prolific public writer on care delivery, payment models, and seniors’ health — a senior operator who could field paid expert questions on his own schedule.",
    confidence: "high",
  },
  {
    name: "Robert M. Wachter",
    role: "Professor & Chair, Department of Medicine (Benioff Endowed Chair in Hospital Medicine)",
    company: "UCSF",
    domain: "Healthcare",
    profileUrl: "https://en.wikipedia.org/wiki/Robert_M._Wachter",
    whyFit:
      "Coined the term “hospitalist” and is a bestselling author on healthcare technology/AI — a recognized, articulate authority on hospital operations, patient safety, and AI in medicine.",
    confidence: "high",
  },

  // ── Marketing ───────────────────────────────────────────────────────────
  {
    name: "April Dunford",
    role: "Founder/Principal positioning consultant; author of “Obviously Awesome” and “Sales Pitch”",
    company: "Ambient Strategy",
    domain: "Marketing",
    profileUrl: "https://www.aprildunford.com/about",
    whyFit:
      "The most-cited name in B2B positioning, who already monetizes expertise via consulting, paid workshops, and a podcast — answering discrete expert questions is a natural extension.",
    confidence: "high",
  },
  {
    name: "Rand Fishkin",
    role: "CEO & co-founder (audience-research software); former co-founder/CEO of Moz; author of “Lost and Founder”",
    company: "SparkToro",
    domain: "Marketing",
    profileUrl: "https://sparktoro.com/team/rand",
    whyFit:
      "A widely-recognized marketing practitioner and author who keynotes globally and publicly lists a direct contact — clearly open to compensated engagements and sharp marketing/startup questions.",
    confidence: "high",
  },

  // ── Sales ───────────────────────────────────────────────────────────────
  {
    name: "Anthony Iannarino",
    role: "Founder, Visualizing Transformation (sales training, consulting, coaching); co-founder of OutBound Conference",
    company: "Visualizing Transformation",
    domain: "Sales",
    profileUrl: "https://www.thesalesblog.com/anthony-iannarino",
    whyFit:
      "Prolific B2B sales thinker (6 books, 2x USA Today bestseller) who has answered sales questions publicly every day for 15+ years — pre-disposed to a paid-per-answer model.",
    confidence: "high",
  },

  // ── Operations ──────────────────────────────────────────────────────────
  {
    name: "Cameron Herold",
    role: "Founder, COO Alliance; CEO/COO coach and keynote speaker; former COO of 1-800-GOT-JUNK",
    company: "COO Alliance",
    domain: "Operations",
    profileUrl: "https://cameronherold.com/",
    whyFit:
      "The definitive “COO whisperer” with a built-in network of 250+ operators — both a perfect expert and a potential channel to other operations experts for High Bar.",
    confidence: "high",
  },

  // ── Business leadership ─────────────────────────────────────────────────
  {
    name: "Whitney Johnson",
    role: "CEO & co-founder (leadership development); Thinkers50 top-10 thinker; bestselling author",
    company: "Disruption Advisors",
    domain: "Business leadership",
    profileUrl: "https://thedisruptionadvisors.com/",
    whyFit:
      "A marquee leadership expert (creator of the “S Curve of Learning,” co-founder of a fund with Clayton Christensen) who already does paid advisory and speaking on growing leaders.",
    confidence: "high",
  },
];
