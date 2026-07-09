import { useMemo, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { orderedCorpus, type InspirationCard } from "./corpus/corpus";
import {
  applySwipe,
  confidence,
  initialState,
  likedHue,
  overallConfidence,
  type SwipeDirection,
  type SwipeEvent,
  type TasteState,
} from "./taste/model";
import { sampleVariant } from "./taste/variants";
import { tokensFromTaste } from "./taste/tokens";
import { generateTasteFile, type TasteFile } from "./taste/tasteFile";
import { SwipeCard, type DeckCard } from "./components/SwipeCard";
import { MockUI } from "./components/MockUI";
import { TasteCard } from "./components/TasteCard";
import { TasteFileModal } from "./components/TasteFileModal";

const INSPIRATION = orderedCorpus();
const VARIANTS_START = 10; // variants begin appearing after ~10 swipes
const VISIBLE_STACK = 3;
const SESSION_CARD_COUNT = 30;

type Tab = "swipe" | "compass";

export default function App() {
  const [state, setState] = useState<TasteState>(initialState);
  const [tab, setTab] = useState<Tab>("swipe");
  const [tasteFile, setTasteFile] = useState<TasteFile | null>(null);

  const producedRef = useRef(0);
  const inspIdxRef = useRef(0);
  const variantIdxRef = useRef(0);

  const produceCard = useRef((from: TasteState): DeckCard => {
    const produced = producedRef.current;
    producedRef.current += 1;

    const variantProb = Math.min(0.85, (produced - VARIANTS_START) / 20 + 0.3);
    const useVariant = produced >= VARIANTS_START && Math.random() < variantProb;

    if (useVariant) {
      variantIdxRef.current += 1;
      return sampleVariant(from, variantIdxRef.current);
    }
    const card = INSPIRATION[inspIdxRef.current % INSPIRATION.length] as InspirationCard;
    inspIdxRef.current += 1;
    // fresh id so cycling the corpus never collides in the render key
    return { ...card, id: `${card.id}-${produced}` };
  }).current;

  const [queue, setQueue] = useState<DeckCard[]>(() => {
    const initial = initialState();
    return Array.from({ length: VISIBLE_STACK }, () => produceCard(initial));
  });

  const hue = likedHue(state);
  const tokens = useMemo(() => tokensFromTaste(state.taste, hue), [state.taste, hue]);
  const conf = useMemo(() => confidence(state), [state]);
  const overall = overallConfidence(state);

  function handleSwipe(direction: SwipeDirection) {
    const top = queue[0];
    if (!top) return;

    setState((prev) => {
      const event: SwipeEvent = {
        cardId: top.id,
        cardKind: top.kind,
        direction,
        attrs: top.attrs,
        hue: top.hue,
        at: Date.now(),
      };
      const next = applySwipe(prev, event);
      setQueue((q) => {
        const remaining = q.slice(1);
        return producedRef.current < SESSION_CARD_COUNT
          ? [...remaining, produceCard(next)]
          : remaining;
      });
      return next;
    });
  }

  function generate() {
    setTasteFile(generateTasteFile(state.taste, tokens, hue, state.swipes.length));
  }

  const variantsActive = producedRef.current > VARIANTS_START;
  const cardsRemaining = SESSION_CARD_COUNT - state.swipes.length;
  const phase =
    cardsRemaining === 0
      ? "Complete"
      : state.swipes.length < VARIANTS_START
        ? "Learning"
        : variantsActive
          ? "Breeding"
          : "Learning";

  return (
    <div className="app">
      <div className="topbar">
        <div className="brand">
          Taste Engine
        </div>
        <div className="brand-sub">{phase} · {state.swipes.length} swipes</div>
      </div>

      <div className="tabs">
        <button className={`tab${tab === "swipe" ? " active" : ""}`} onClick={() => setTab("swipe")}>
          Swipe
        </button>
        <button
          className={`tab${tab === "compass" ? " active" : ""}`}
          onClick={() => setTab("compass")}
        >
          Style Compass
        </button>
      </div>

      {tab === "swipe" ? (
        <div className="swipe-view">
          <div className="mirror-panel">
            <div className="mirror-tag">
              Live preview
            </div>
            <div className="mirror-frame">
              <MockUI tokens={tokens} layout="dashboard" />
            </div>
          </div>

          <div className="deck-header">
            <span>Style cards</span>
            <span>{cardsRemaining} remaining</span>
          </div>

          <div className="deck">
            <AnimatePresence>
              {queue.length > 0 ? (
                queue
                .slice(0, VISIBLE_STACK)
                .map((card, i) => (
                  <SwipeCard
                    key={card.id}
                    card={card}
                    isTop={i === 0}
                    offset={i}
                    onSwipe={handleSwipe}
                  />
                ))
                .reverse()
              ) : (
                <div className="deck-complete">
                  <div className="deck-complete-title">Your style is ready</div>
                  <button onClick={() => setTab("compass")}>Open Style Compass</button>
                </div>
              )}
            </AnimatePresence>
          </div>

          {queue.length > 0 && (
            <div className="deck-actions">
              <button className="act pass" onClick={() => handleSwipe("pass")} aria-label="Pass">
                ✕
              </button>
              <button className="act super" onClick={() => handleSwipe("superlike")} aria-label="Superlike">
                ★
              </button>
              <button className="act like" onClick={() => handleSwipe("like")} aria-label="Like">
                ♥
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="fingerprint-view">
          <TasteCard
            taste={state.taste}
            confidence={conf}
            tokens={tokens}
            hue={hue}
            swipeCount={state.swipes.length}
            overall={overall}
            onGenerate={generate}
          />
        </div>
      )}

      {tasteFile && <TasteFileModal file={tasteFile} onClose={() => setTasteFile(null)} />}
    </div>
  );
}
