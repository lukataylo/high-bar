"use client";

import { ArrowLeft, Check, Loader2, MessageSquareText, Sparkles } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";

type AskResult = {
  ok: boolean;
  questionId?: string;
  status?: string;
  nextStep?: string;
  route?: {
    topExperts?: Array<{
      name: string;
      role: string;
      company: string;
      matchScore: number;
      availability: string;
    }>;
  };
  error?: string;
};

export default function AskQuestionPage() {
  const [question, setQuestion] = useState("What should a Claude Code agent inspect when an MCP tool call starts failing?");
  const [context, setContext] = useState("The schema changed and the agent keeps retrying the same invalid arguments.");
  const [result, setResult] = useState<AskResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setResult(null);

    const response = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, context, requester: "High Bar web asker" })
    });
    const payload = await response.json() as AskResult;

    setResult(payload);
    setIsSubmitting(false);
  }

  return (
    <main className="ask-page">
      <section className="ask-card" aria-labelledby="ask-title">
        <Link className="back-link" href="/">
          <ArrowLeft size={16} />
          High Bar
        </Link>
        <p className="section-kicker">Ask a human expert</p>
        <h1 id="ask-title">Send a stuck question to High Bar.</h1>
        <p>
          Use this when an agent or human has tried the obvious path and needs a
          knowledgeable person to answer the blocker.
        </p>

        <form className="ask-form" onSubmit={submitQuestion}>
          <label htmlFor="question">Question</label>
          <textarea
            id="question"
            minLength={10}
            onChange={(event) => setQuestion(event.target.value)}
            required
            rows={4}
            value={question}
          />

          <label htmlFor="context">Context</label>
          <textarea
            id="context"
            onChange={(event) => setContext(event.target.value)}
            rows={3}
            value={context}
          />

          <button className="button-primary ask-submit" disabled={isSubmitting} type="submit">
            {isSubmitting ? <Loader2 className="spin-icon" size={16} /> : <MessageSquareText size={16} />}
            Route to an expert
          </button>
        </form>
      </section>

      <aside className="ask-result-card" aria-live="polite">
        {!result ? (
          <>
            <Sparkles size={20} />
            <h2>What happens next</h2>
            <p>
              High Bar infers the topic, matches relevant experts, and prepares the
              answer request. The API path stays available for agents at <code>/api/ask</code>.
            </p>
          </>
        ) : result.ok ? (
          <>
            <Check size={20} />
            <p className="section-kicker">Queued</p>
            <h2>{result.questionId}</h2>
            <p>{result.nextStep}</p>
            <div className="matched-experts">
              {result.route?.topExperts?.map((expert) => (
                <div key={`${expert.name}-${expert.company}`}>
                  <strong>{expert.name}</strong>
                  <span>{expert.role} at {expert.company}</span>
                  <small>{expert.matchScore}/100 match - {expert.availability}</small>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <h2>Question was not submitted</h2>
            <p>{result.error ?? "Try again with a clearer question."}</p>
          </>
        )}
      </aside>
    </main>
  );
}
