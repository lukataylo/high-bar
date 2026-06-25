"use client";

import {
  ArrowRight,
  Check,
  Copy,
  Stethoscope,
  Scale,
  Cpu,
  LineChart,
  ShieldCheck,
  Workflow,
  Star,
  Terminal
} from "lucide-react";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentType
} from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Run layout effects on the client, plain effect on the server (SSR-safe).
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

type QA = {
  domain: string;
  icon: ComponentType<{ size?: number | string }>;
  question: string;
  answer: string;
  expert: string;
  role: string;
  rating: string;
};

const QA_CARDS: QA[] = [
  {
    domain: "Engineering",
    icon: Cpu,
    question: "Our Postgres connection pool keeps exhausting under load. Where do we start?",
    answer: "Cap pool size to (cores * 2) + spindles and move long jobs off the request path with PgBouncer in transaction mode.",
    expert: "Maya Chen",
    role: "Staff SRE",
    rating: "4.9"
  },
  {
    domain: "Finance",
    icon: LineChart,
    question: "How should an early SaaS treat annual prepayments in its cash runway model?",
    answer: "Book them as deferred revenue, but model runway on cash collected — count the full prepayment the month it lands.",
    expert: "David Okonkwo",
    role: "Fractional CFO",
    rating: "5.0"
  },
  {
    domain: "Healthcare",
    icon: Stethoscope,
    question: "Patient on metformin with eGFR dropping to 38 — do we hold or adjust?",
    answer: "Continue but cap at 1000 mg/day below eGFR 45; stop entirely under 30 and recheck renal function in two weeks.",
    expert: "Dr. Priya Nair",
    role: "Nephrologist",
    rating: "4.9"
  },
  {
    domain: "Legal",
    icon: Scale,
    question: "Is a US-style mutual NDA enforceable against a contractor based in Germany?",
    answer: "Yes, but add a GDPR data-processing clause and a forum choice — German courts will read overbroad scope down hard.",
    expert: "Helena Brandt",
    role: "Tech Counsel",
    rating: "4.8"
  },
  {
    domain: "Insurance",
    icon: ShieldCheck,
    question: "Cyber claim denied citing 'failure to patch'. Any real angle to push back?",
    answer: "Yes — demand the underwriting file. If the control wasn't a stated condition precedent, the denial usually doesn't hold.",
    expert: "Tomás Rivera",
    role: "Claims Adjuster",
    rating: "4.9"
  },
  {
    domain: "Operations",
    icon: Workflow,
    question: "Warehouse pick accuracy stuck at 96%. What moves the needle fastest?",
    answer: "Switch to zone-based batch picking with a scan-to-confirm at putaway. Most errors are upstream, not at the pick.",
    expert: "Sara Lindqvist",
    role: "Ops Director",
    rating: "5.0"
  },
  {
    domain: "Engineering",
    icon: Cpu,
    question: "Our AI agent loops calling the same tool. How do we break the cycle safely?",
    answer: "Add a per-tool call budget plus a dedup guard on identical args, and surface a stuck-state so a human can step in.",
    expert: "Jonah Feld",
    role: "ML Platform Lead",
    rating: "4.9"
  }
];

const CURL_COMMAND =
  'curl -s "https://highbar.dev/api/ask?question=YOUR_QUESTION"';

const JSON_SNIPPET = `{
  "ok": true,
  "questionId": "Q-7F3A9C21",
  "status": "queued_for_human_expert",
  "route": {
    "topExperts": [
      { "name": "Maya Chen", "role": "Staff SRE", "matchScore": 0.94 }
    ]
  }
}`;

export function Keynote() {
  const rootRef = useRef<HTMLDivElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLUListElement>(null);

  useIsomorphicLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      // No animation: the gallery stays a native horizontal scroller,
      // and all content is already visible in its natural state.
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      // 1. Hero — headline + subhead + buttons rise and fade in on load.
      gsap.from("[data-hero-rise]", {
        y: 28,
        autoAlpha: 0,
        duration: 0.9,
        ease: "power3.out",
        stagger: 0.12,
        delay: 0.1
      });

      // 2. Live Q&A gallery — pin the section and scrub the strip left.
      const viewport = viewportRef.current;
      const track = trackRef.current;
      const gallery = galleryRef.current;
      if (viewport && track && gallery) {
        viewport.classList.add("is-pinned");
        const getDistance = () =>
          Math.max(0, track.scrollWidth - viewport.clientWidth);

        gsap.to(track, {
          x: () => -getDistance(),
          ease: "none",
          scrollTrigger: {
            trigger: gallery,
            start: "top top",
            end: () => `+=${getDistance()}`,
            pin: true,
            scrub: 1,
            anticipatePin: 1,
            invalidateOnRefresh: true
          }
        });
      }

      // 3 & 4. Reveal blocks on scroll (tiles + agent card + footer).
      const reveals = gsap.utils.toArray<HTMLElement>("[data-reveal]");
      reveals.forEach((el) => {
        gsap.from(el, {
          y: 40,
          autoAlpha: 0,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            start: "top 82%"
          }
        });
      });
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <div className="keynote" ref={rootRef}>
      <header className="keynote-nav">
        <a className="keynote-wordmark" href="#top" aria-label="High Bar home">
          <img
            src="/logo.svg"
            alt="High Bar"
            width={24}
            height={26}
            className="keynote-logo"
          />
          <span>High Bar</span>
        </a>
        <nav className="keynote-nav-links" aria-label="Primary">
          <a href="#how">How it works</a>
          <a href="#experts">For experts</a>
          <a href="#agents">For agents</a>
        </nav>
        <a className="keynote-nav-cta" href="/ask">
          Ask a question
        </a>
      </header>

      <main>
        {/* 1. Hero */}
        <section className="keynote-hero" id="top">
          <img
            src="/hero.svg"
            alt="High Bar connects hard questions to vetted human experts"
            className="keynote-hero-art"
            data-hero-rise
          />
          <h1 className="keynote-hero-title" data-hero-rise>
            Expert answers, on demand.
          </h1>
          <p className="keynote-hero-sub" data-hero-rise>
            For humans and AI agents. In minutes.
          </p>
          <div className="keynote-hero-actions" data-hero-rise>
            <a className="keynote-btn keynote-btn-primary" href="/ask">
              Ask a question
              <ArrowRight size={18} aria-hidden="true" />
            </a>
            <a className="keynote-btn keynote-btn-ghost" href="/pwa">
              Answer &amp; earn
            </a>
          </div>
        </section>

        {/* 2. Live Q&A gallery */}
        <section
          className="keynote-gallery"
          id="experts"
          ref={galleryRef}
          aria-label="Live questions answered by experts"
        >
          <div className="keynote-gallery-head">
            <p className="keynote-kicker">Live on High Bar</p>
            <h2 className="keynote-gallery-title">Real questions. Real experts.</h2>
          </div>
          <div className="keynote-gallery-viewport" ref={viewportRef}>
            <ul className="keynote-track" ref={trackRef}>
              {QA_CARDS.map((card) => {
                const Icon = card.icon;
                return (
                  <li className="keynote-card" key={card.question}>
                    <div className="keynote-card-domain">
                      <Icon size={16} aria-hidden="true" />
                      <span>{card.domain}</span>
                    </div>
                    <p className="keynote-card-q">{card.question}</p>
                    <p className="keynote-card-a">{card.answer}</p>
                    <div className="keynote-card-foot">
                      <div className="keynote-card-expert">
                        <strong>{card.expert}</strong>
                        <span>{card.role}</span>
                      </div>
                      <span className="keynote-card-rating">
                        <Star size={13} aria-hidden="true" />
                        {card.rating}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* 3. Two tiles */}
        <section className="keynote-tiles" id="how" aria-label="Get started">
          <article className="keynote-tile" data-reveal>
            <p className="keynote-kicker">For experts</p>
            <h2 className="keynote-tile-title">Answer &amp; earn</h2>
            <p className="keynote-tile-body">
              Claim the questions you&rsquo;ll nail. Reply on your own time. Paid the
              moment your answer is accepted.
            </p>
            <a className="keynote-btn keynote-btn-dark" href="/pwa">
              Start answering
              <ArrowRight size={18} aria-hidden="true" />
            </a>
          </article>
          <article className="keynote-tile" data-reveal>
            <p className="keynote-kicker">For humans</p>
            <h2 className="keynote-tile-title">Ask a question</h2>
            <p className="keynote-tile-body">
              Bring your hardest question. A vetted specialist answers fast — and you
              only pay for answers that land.
            </p>
            <a className="keynote-btn keynote-btn-dark" href="/ask">
              Ask now
              <ArrowRight size={18} aria-hidden="true" />
            </a>
          </article>
        </section>

        {/* 4. For agents */}
        <section className="keynote-agents" id="agents" aria-label="For AI agents">
          <div className="keynote-agents-inner" data-reveal>
            <p className="keynote-kicker keynote-kicker-light">For agents</p>
            <h2 className="keynote-agents-title">One call to a human expert.</h2>
            <p className="keynote-agents-caption">
              Point your agent at High Bar over MCP or REST — it gets a vetted human
              answer back as JSON.
            </p>
            <CommandBlock />
            <pre className="keynote-json" aria-label="Example JSON response">
              <code>{JSON_SNIPPET}</code>
            </pre>
          </div>
        </section>
      </main>

      {/* 5. Footer */}
      <footer className="keynote-footer" data-reveal>
        <a className="keynote-wordmark" href="#top" aria-label="High Bar home">
          <img
            src="/logo.svg"
            alt="High Bar"
            width={22}
            height={24}
            className="keynote-logo"
          />
          <span>High Bar</span>
        </a>
        <p className="keynote-footer-tag">Ask → Match → Answer → Pay out</p>
        <nav className="keynote-footer-links" aria-label="Footer">
          <a href="/ask">Ask a question</a>
          <a href="/pwa">Answer &amp; earn</a>
          <a href="/api/ask">Agent API</a>
        </nav>
      </footer>
    </div>
  );
}

function CommandBlock() {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(CURL_COMMAND);
      setCopied(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable — leave the command visible for manual copy.
    }
  }

  return (
    <div className="keynote-terminal">
      <div className="keynote-terminal-bar" aria-hidden="true">
        <Terminal size={14} />
        <span className="keynote-dot" />
        <span className="keynote-dot" />
        <span className="keynote-dot" />
      </div>
      <div className="keynote-terminal-body">
        <code className="keynote-cmd">
          <span className="keynote-cmd-prompt" aria-hidden="true">
            $
          </span>
          {CURL_COMMAND}
        </code>
        <button
          type="button"
          className="keynote-copy"
          onClick={handleCopy}
          aria-label={copied ? "Command copied to clipboard" : "Copy command to clipboard"}
        >
          {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
          <span>{copied ? "Copied!" : "Copy"}</span>
        </button>
      </div>
      <span className="keynote-sr-status" role="status" aria-live="polite">
        {copied ? "Copied to clipboard" : ""}
      </span>
    </div>
  );
}
