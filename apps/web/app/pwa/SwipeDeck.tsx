"use client";

import { Bot, Check, Inbox, Tag, User, X } from "lucide-react";
import {
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent
} from "react";
import { Countdown } from "./Countdown";
import styles from "./enhance.module.css";
import type { Question } from "./types";

const THRESHOLD = 110;
const FLING = 460;
const ANIM_MS = 280;

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});

export function SwipeDeck({
  questions,
  now,
  onClaim,
  onSkip
}: {
  questions: Question[];
  now: number;
  onClaim: (id: string) => void;
  onSkip: (id: string) => void;
}) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [leaving, setLeaving] = useState<"left" | "right" | null>(null);
  const startX = useRef(0);

  const top = questions[0];

  function commit(dir: "left" | "right") {
    if (!top || leaving) return;
    setLeaving(dir);
    setDragging(false);
    setOffset(dir === "right" ? FLING : -FLING);
    window.setTimeout(() => {
      if (dir === "right") {
        onClaim(top.id);
      } else {
        onSkip(top.id);
      }
      setOffset(0);
      setLeaving(null);
    }, ANIM_MS);
  }

  function handleDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!top || leaving) return;
    startX.current = event.clientX;
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    setOffset(event.clientX - startX.current);
  }

  function handleUp() {
    if (!dragging) return;
    setDragging(false);
    if (offset > THRESHOLD) {
      commit("right");
    } else if (offset < -THRESHOLD) {
      commit("left");
    } else {
      setOffset(0);
    }
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (!top || leaving) return;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      commit("right");
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      commit("left");
    }
  }

  if (!top) {
    return (
      <div className="swipe-empty" role="status">
        <span className="swipe-empty-icon" aria-hidden="true">
          <Inbox size={28} />
        </span>
        <h2>You&rsquo;re all caught up</h2>
        <p>No new questions in your queue. Check back soon — fresh ones arrive throughout the day.</p>
      </div>
    );
  }

  const stack = questions.slice(0, 3);
  const claimHint = Math.max(0, Math.min(1, offset / THRESHOLD));
  const skipHint = Math.max(0, Math.min(1, -offset / THRESHOLD));

  return (
    <div className="swipe-area">
      <div
        aria-label="Question deck. Swipe right or press the right arrow to answer, swipe left or press the left arrow to pass."
        className={`swipe-deck ${styles.deckFocus}`}
        onKeyDown={handleKeyDown}
        role="group"
        tabIndex={0}
      >
        {stack
          .map((question, index) => ({ question, index }))
          .reverse()
          .map(({ question, index }) => {
            const isTop = index === 0;
            const depth = index;
            const baseTransform = `translateY(${depth * 14}px) scale(${1 - depth * 0.05})`;
            const topTransform = `translateX(${offset}px) rotate(${offset * 0.05}deg)`;
            return (
              <div
                aria-hidden={!isTop}
                className={`swipe-card${isTop ? " is-top" : ""}${leaving && isTop ? " is-leaving" : ""}${isTop ? ` ${styles.topHighlight}` : ""}`}
                key={question.id}
                onPointerCancel={isTop ? handleUp : undefined}
                onPointerDown={isTop ? handleDown : undefined}
                onPointerMove={isTop ? handleMove : undefined}
                onPointerUp={isTop ? handleUp : undefined}
                style={{
                  transform: isTop ? topTransform : baseTransform,
                  transition: isTop && dragging ? "none" : `transform ${ANIM_MS}ms ease`,
                  zIndex: stack.length - index
                }}
              >
                {isTop ? (
                  <>
                    <div
                      aria-hidden="true"
                      className={`${styles.tint} ${styles.tintAnswer}`}
                      style={{ opacity: claimHint }}
                    />
                    <div
                      aria-hidden="true"
                      className={`${styles.tint} ${styles.tintPass}`}
                      style={{ opacity: skipHint }}
                    />
                    <span
                      aria-hidden="true"
                      className={`${styles.affordance} ${styles.affordanceAnswer}`}
                      style={{ opacity: claimHint }}
                    >
                      <Check size={20} /> Answer
                    </span>
                    <span
                      aria-hidden="true"
                      className={`${styles.affordance} ${styles.affordancePass}`}
                      style={{ opacity: skipHint }}
                    >
                      <X size={20} /> Pass
                    </span>
                  </>
                ) : null}

                <div className="swipe-card-head">
                  <span className={`swipe-source ${question.source}`}>
                    {question.source === "agent" ? <Bot size={14} /> : <User size={14} />}
                    {question.sourceLabel}
                  </span>
                  <span className="swipe-domain">
                    <Tag size={12} />
                    {question.domain}
                  </span>
                </div>

                <h2 className="swipe-card-title">{question.title}</h2>
                <p className="swipe-card-detail">{question.detail}</p>

                <div className={styles.cardFooter}>
                  <div className={styles.bounty}>
                    <span className={styles.bountyLabel}>Bounty</span>
                    <span className={styles.bountyAmount}>{money.format(question.reward)}</span>
                  </div>
                  <div className={styles.cardClock}>
                    <span className={styles.cardSla}>{question.slaHours}h SLA</span>
                    {isTop ? (
                      <Countdown expiresAt={question.expiresAt} now={now} />
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      <div className="swipe-controls">
        <button
          aria-label={`Pass: ${top.title}`}
          className="swipe-button skip"
          onClick={() => commit("left")}
          type="button"
        >
          <X size={22} />
        </button>
        <span className="swipe-count" aria-live="polite">
          {questions.length} left
        </span>
        <button
          aria-label={`Answer: ${top.title}`}
          className="swipe-button claim"
          onClick={() => commit("right")}
          type="button"
        >
          <Check size={22} />
        </button>
      </div>
    </div>
  );
}
