import { useState } from "react";
import { motion, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import type { InspirationCard } from "../corpus/corpus";
import type { VariantCard } from "../taste/variants";
import { DIMENSIONS } from "../taste/dimensions";
import { tokensFromTaste } from "../taste/tokens";
import type { SwipeDirection } from "../taste/model";
import { MockUI } from "./MockUI";

export type DeckCard = InspirationCard | VariantCard;

interface Props {
  card: DeckCard;
  isTop: boolean;
  offset: number;
  onSwipe: (direction: SwipeDirection) => void;
}

const SWIPE_X = 110;
const SWIPE_UP = 130;

export function SwipeCard({ card, isTop, offset, onSwipe }: Props) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-240, 240], [-16, 16]);
  const likeOpacity = useTransform(x, [20, SWIPE_X], [0, 1]);
  const passOpacity = useTransform(x, [-SWIPE_X, -20], [1, 0]);
  const superOpacity = useTransform(y, [-SWIPE_UP, -30], [1, 0]);

  const [flipped, setFlipped] = useState(false);
  const [pressTimer, setPressTimer] = useState<number | null>(null);

  const layout = card.kind === "inspiration" ? card.layout : "dashboard";
  const tokens = tokensFromTaste(card.attrs, card.hue);

  function handleDragEnd(_: unknown, info: PanInfo) {
    const dx = info.offset.x;
    const dy = info.offset.y;
    if (dy < -SWIPE_UP && Math.abs(dx) < SWIPE_X) {
      onSwipe("superlike");
    } else if (dx > SWIPE_X) {
      onSwipe("like");
    } else if (dx < -SWIPE_X) {
      onSwipe("pass");
    } else {
      x.set(0);
      y.set(0);
    }
  }

  function startPress() {
    const id = window.setTimeout(() => setFlipped((f) => !f), 380);
    setPressTimer(id);
  }
  function endPress() {
    if (pressTimer) {
      window.clearTimeout(pressTimer);
      setPressTimer(null);
    }
  }

  // Top 4 dimensions this card most strongly expresses (for the flip side).
  const teaching = [...DIMENSIONS]
    .map((d) => ({ d, strength: Math.abs(card.attrs[d.key] - 0.5) }))
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 5);

  return (
    <motion.div
      className="swipe-card"
      style={{
        x,
        y,
        rotate: isTop ? rotate : 0,
        zIndex: 100 - offset,
        scale: 1 - offset * 0.04,
        translateY: offset * 12,
        pointerEvents: isTop ? "auto" : "none",
      }}
      drag={isTop}
      dragSnapToOrigin
      dragElastic={0.7}
      onDragEnd={handleDragEnd}
      onPointerDown={startPress}
      onPointerUp={endPress}
      onPointerCancel={endPress}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ x: x.get() > 0 ? 400 : x.get() < 0 ? -400 : 0, y: y.get() < -50 ? -500 : 0, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
    >
      <div className={`card-inner${flipped ? " flipped" : ""}`}>
        <div className="card-face card-front">
          <div className="card-preview">
            <MockUI tokens={tokens} layout={layout} compact />
          </div>
          <div className="card-meta">
            <div>
              <div className="card-name">{card.name}</div>
              <div className="card-tagline">{card.tagline}</div>
            </div>
            {card.kind === "variant" && (
              <span className={`card-badge${card.offTaste ? " off" : ""}`}>
                {card.offTaste ? "PROBE" : "BRED"}
              </span>
            )}
          </div>

          {isTop && (
            <>
              <motion.div className="stamp like" style={{ opacity: likeOpacity }}>
                LIKE
              </motion.div>
              <motion.div className="stamp pass" style={{ opacity: passOpacity }}>
                PASS
              </motion.div>
              <motion.div className="stamp super" style={{ opacity: superOpacity }}>
                SUPERLIKE
              </motion.div>
            </>
          )}
        </div>

        <div className="card-face card-back">
          <div className="card-back-title">Teaching the model</div>
          <div className="card-back-sub">{card.name} scores highest on:</div>
          <div className="teach-list">
            {teaching.map(({ d }) => {
              const v = card.attrs[d.key];
              return (
                <div className="teach-row" key={d.key}>
                  <span className="teach-label">{d.label}</span>
                  <div className="teach-track">
                    <span className="teach-fill" style={{ width: `${v * 100}%` }} />
                  </div>
                  <span className="teach-val">{v < 0.5 ? d.low : d.high}</span>
                </div>
              );
            })}
          </div>
          <div className="card-back-hint">long-press to flip back</div>
        </div>
      </div>
    </motion.div>
  );
}
