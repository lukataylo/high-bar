import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { orderedCorpus, type InspirationCard } from "./corpus/corpus";
import {
  applySwipe,
  confidence,
  likedHue,
  overallConfidence,
  replaySwipes,
  type SwipeDirection,
  type SwipeEvent,
  type TasteState,
} from "./taste/model";
import { sampleVariant } from "./taste/variants";
import { tokensFromTaste } from "./taste/tokens";
import { generatorConfig } from "./taste/generatorConfig";
import { resolveStickyChoices, type StickyChoices } from "./taste/stickyChoices";
import { SwipeCard, type DeckCard } from "./components/SwipeCard";
import { MockUI } from "./components/MockUI";
import { SitePreview } from "./components/SitePreview";
import { TasteCard } from "./components/TasteCard";
import { TasteFileModal } from "./components/TasteFileModal";
import { SwipeHistoryModal } from "./components/SwipeHistoryModal";
import { ClientSwitcherModal } from "./components/ClientSwitcherModal";
import { SlopOffLogo } from "./components/SlopOffLogo";
import {
  createProfile,
  deleteProfile,
  getActiveProfile,
  loadStore,
  renameProfile,
  saveTasteState,
  switchProfile,
} from "./lib/clientProfiles";

const INSPIRATION = orderedCorpus();
const VARIANTS_START = 10; // variants begin appearing after ~10 swipes
const VISIBLE_STACK = 3;
const SESSION_CARD_COUNT = 30;

type Tab = "swipe" | "compass";

interface DeckHistoryEntry {
  card: DeckCard;
  replacementAdded: boolean;
}

interface MotionPermissionDeviceEvent extends EventTarget {
  requestPermission?: () => Promise<"granted" | "denied">;
}

export default function App() {
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [profileStore, setProfileStore] = useState(() => loadStore());
  const [state, setState] = useState<TasteState>(() => getActiveProfile(profileStore).state);
  const [tab, setTab] = useState<Tab>("swipe");
  const [showTasteFile, setShowTasteFile] = useState(false);
  const [deckHistory, setDeckHistory] = useState<DeckHistoryEntry[]>([]);
  const [undoNotice, setUndoNotice] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showClients, setShowClients] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [addressInput, setAddressInput] = useState("");
  // Narrow (default): font pairing / accent-hue bucket lock in and variant
  // exploration tightens as confidence rises. Keep exploring: always take
  // the freshest nearest match and keep sampling wide, even late in a
  // session — see stickyChoices.ts / variants.ts.
  const [narrowMode, setNarrowMode] = useState(true);

  const producedRef = useRef(0);
  const inspIdxRef = useRef(0);
  const variantIdxRef = useRef(0);
  const lastMotionRef = useRef({ x: 0, y: 0, z: 0 });
  const lastShakeRef = useRef(0);
  const undoTimerRef = useRef<number | null>(null);
  const stickyRef = useRef<StickyChoices | null>(null);
  // produceCard below is created once (useRef initializer) but narrowMode
  // can change on every render, so it reads this ref rather than closing
  // over the (potentially stale) state value directly.
  const narrowModeRef = useRef(narrowMode);
  narrowModeRef.current = narrowMode;

  const produceCard = useRef((from: TasteState): DeckCard => {
    const produced = producedRef.current;
    producedRef.current += 1;

    const variantProb = Math.min(0.85, (produced - VARIANTS_START) / 20 + 0.3);
    const useVariant = produced >= VARIANTS_START && Math.random() < variantProb;

    if (useVariant) {
      variantIdxRef.current += 1;
      return sampleVariant(from, variantIdxRef.current, narrowModeRef.current);
    }
    const card = INSPIRATION[inspIdxRef.current % INSPIRATION.length] as InspirationCard;
    inspIdxRef.current += 1;
    // fresh id so cycling the corpus never collides in the render key
    return { ...card, id: `${card.id}-${produced}` };
  }).current;

  const [queue, setQueue] = useState<DeckCard[]>(() =>
    Array.from({ length: VISIBLE_STACK }, () => produceCard(state)),
  );

  // Every taste-state change (a swipe, an undo, a swipe removal) is saved to
  // the active client profile so it survives a reload.
  useEffect(() => {
    setProfileStore((store) => saveTasteState(store, store.activeId, state));
  }, [state]);

  // Switching clients (or creating/deleting one, which also changes the
  // active id) loads that profile's taste state and restarts the swipe deck
  // session — deck progress is per-session UI state, not part of a client's
  // saved identity.
  const activeProfileIdRef = useRef(profileStore.activeId);
  useEffect(() => {
    if (profileStore.activeId === activeProfileIdRef.current) return;
    activeProfileIdRef.current = profileStore.activeId;
    const profile = getActiveProfile(profileStore);
    producedRef.current = 0;
    inspIdxRef.current = 0;
    variantIdxRef.current = 0;
    stickyRef.current = null; // a different client's locked-in pairing/hue shouldn't carry over
    setState(profile.state);
    setQueue(Array.from({ length: VISIBLE_STACK }, () => produceCard(profile.state)));
    setDeckHistory([]);
    setTab("swipe");
  }, [profileStore, produceCard]);

  const activeProfile = getActiveProfile(profileStore);

  function switchClient(id: string) {
    setProfileStore((store) => switchProfile(store, id));
    setShowClients(false);
  }

  function addClient(name: string) {
    setProfileStore((store) => createProfile(store, name));
    setShowClients(false);
  }

  function renameClient(id: string, name: string) {
    setProfileStore((store) => renameProfile(store, id, name));
  }

  function removeClient(id: string) {
    setProfileStore((store) => deleteProfile(store, id));
  }

  const hue = likedHue(state);
  const conf = useMemo(() => confidence(state), [state]);
  const overall = overallConfidence(state);

  // Resolved once per render from the previous commit (stickyRef), not
  // memoized — resolveStickyChoices is cheap, and this keeps "previous" and
  // "next" trivially consistent without a separate effect.
  const sticky = resolveStickyChoices(state.taste, generatorConfig, stickyRef.current, overall, narrowMode);
  stickyRef.current = sticky;

  const tokens = useMemo(
    () => tokensFromTaste(state.taste, hue, generatorConfig, sticky),
    [state.taste, hue, sticky],
  );

  function handleSwipe(direction: SwipeDirection) {
    const top = queue[0];
    if (!top) return;

    const event: SwipeEvent = {
      cardId: top.id,
      cardKind: top.kind,
      direction,
      attrs: top.attrs,
      hue: top.hue,
      at: Date.now(),
    };
    const next = applySwipe(state, event);
    const remaining = queue.slice(1);
    const replacementAdded = producedRef.current < SESSION_CARD_COUNT;

    setDeckHistory((history) => [...history, { card: top, replacementAdded }]);
    setState(next);
    setQueue(
      replacementAdded
        ? [...remaining, produceCard(next)]
        : remaining,
    );
  }

  const undoLastSwipe = useCallback(() => {
    const previous = deckHistory[deckHistory.length - 1];
    if (!previous) return;

    let restoredQueue = [previous.card, ...queue];
    if (previous.replacementAdded) {
      const discarded = queue[queue.length - 1];
      restoredQueue = [previous.card, ...queue.slice(0, -1)];
      producedRef.current = Math.max(VISIBLE_STACK, producedRef.current - 1);
      if (discarded?.kind === "variant") {
        variantIdxRef.current = Math.max(0, variantIdxRef.current - 1);
      } else if (discarded) {
        inspIdxRef.current = Math.max(0, inspIdxRef.current - 1);
      }
    }

    setQueue(restoredQueue);
    setDeckHistory((history) => history.slice(0, -1));
    setState(replaySwipes(state.swipes.slice(0, -1)));
    setUndoNotice(true);
    if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
    undoTimerRef.current = window.setTimeout(() => setUndoNotice(false), 1400);
  }, [deckHistory, queue, state.swipes]);

  useEffect(() => {
    if (showOnboarding) return;

    const onMotion = (event: DeviceMotionEvent) => {
      const acceleration = event.accelerationIncludingGravity;
      if (!acceleration) return;

      const current = {
        x: acceleration.x ?? 0,
        y: acceleration.y ?? 0,
        z: acceleration.z ?? 0,
      };
      const previous = lastMotionRef.current;
      const force =
        Math.abs(current.x - previous.x) +
        Math.abs(current.y - previous.y) +
        Math.abs(current.z - previous.z);
      lastMotionRef.current = current;

      const now = Date.now();
      if (force > 28 && now - lastShakeRef.current > 1200) {
        lastShakeRef.current = now;
        undoLastSwipe();
      }
    };

    window.addEventListener("devicemotion", onMotion);
    return () => window.removeEventListener("devicemotion", onMotion);
  }, [showOnboarding, undoLastSwipe]);

  // Desktop has no accelerometer to shake and no touchscreen to drag — arrow
  // keys drive the deck and Cmd/Ctrl+Z undoes, mirroring the swipe gestures
  // and shake-to-undo mobile gets for free.
  useEffect(() => {
    if (showOnboarding || tab !== "swipe") return;

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && /^(input|textarea)$/i.test(target.tagName)) return;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        undoLastSwipe();
        return;
      }
      if (queue.length === 0) return;
      if (event.key === "ArrowLeft") handleSwipe("pass");
      else if (event.key === "ArrowRight") handleSwipe("like");
      else if (event.key === "ArrowUp") {
        event.preventDefault(); // stop the page from scrolling
        handleSwipe("superlike");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  useEffect(
    () => () => {
      if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
    },
    [],
  );

  async function beginSession() {
    const motion = DeviceMotionEvent as unknown as MotionPermissionDeviceEvent;
    if (typeof motion.requestPermission === "function") {
      try {
        await motion.requestPermission();
      } catch {
        // Motion permission is optional; the deck remains fully usable.
      }
    }
    setShowOnboarding(false);
  }

  function generate() {
    setShowTasteFile(true);
  }

  function removeSwipe(index: number) {
    const remaining = state.swipes.filter((_, i) => i !== index);
    setState(replaySwipes(remaining));
    // shake-to-undo tracks the deck by position; an out-of-order removal
    // invalidates that mapping, so drop it rather than risk restoring the wrong card.
    setDeckHistory([]);
  }

  function loadPreview(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) {
      setPreviewUrl(null);
      return;
    }
    setPreviewUrl(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  }

  const cardsRemaining = SESSION_CARD_COUNT - state.swipes.length;

  if (showOnboarding) {
    return (
      <div className="app onboarding">
        <div className="onboarding-logo">
          <SlopOffLogo />
        </div>
        <div className="onboarding-copy">
          <span className="onboarding-kicker">Taste Engine</span>
          <h1>Train your taste.<br />Fix the slop.</h1>
          <p>
            React to design cards. Your app restyles itself after every choice,
            then compiles your taste for Cursor.
          </p>
        </div>
        <div className="swipe-guide">
          <div className="swipe-step">
            <span className="swipe-icon">←</span>
            <strong>Pass</strong>
            <small>Not your style</small>
          </div>
          <div className="swipe-step featured">
            <span className="swipe-icon">→</span>
            <strong>Keep</strong>
            <small>More like this</small>
          </div>
          <div className="swipe-step">
            <span className="swipe-icon">↑</span>
            <strong>Love</strong>
            <small>2× learning</small>
          </div>
        </div>
        <div className="evolution-note">
          <span>✦</span>
          <p>
            Watch the preview evolve live. After 10 swipes, the deck starts
            breeding new designs around your taste.
          </p>
        </div>
        <button className="start-button" onClick={beginSession}>
          Start swiping <span>→</span>
        </button>
        <small className="onboarding-foot">30 cards · about 2 minutes · undo anytime</small>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="topbar">
        <div className="brand">
          <SlopOffLogo />
        </div>
        <div className="topbar-right">
          <button className="client-chip" onClick={() => setShowClients(true)}>
            {activeProfile.name}
          </button>
          <button className="brand-sub" onClick={() => setShowHistory(true)}>
            {state.swipes.length} style {state.swipes.length === 1 ? "save" : "saves"}
          </button>
        </div>
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
              <div className="browser-bar">
                <div className="browser-dots"><i /><i /><i /></div>
                <input
                  className="browser-address"
                  value={addressInput}
                  placeholder="your-app.local"
                  onChange={(e) => setAddressInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    loadPreview(addressInput);
                    e.currentTarget.blur();
                  }}
                  aria-label="Preview URL"
                />
                <span
                  className="browser-more"
                  role="button"
                  aria-label="Reset preview"
                  onClick={() => {
                    setPreviewUrl(null);
                    setAddressInput("");
                  }}
                >
                  {previewUrl ? "✕" : "•••"}
                </span>
              </div>
              <div className="browser-content">
                {previewUrl ? (
                  <SitePreview url={previewUrl} tokens={tokens} />
                ) : (
                  <MockUI tokens={tokens} layout="dashboard" />
                )}
              </div>
            </div>
          </div>

          <div className="deck-header">
            <span>Style cards</span>
            <button
              className="deck-undo"
              onClick={undoLastSwipe}
              disabled={deckHistory.length === 0}
              title="Undo last swipe (Ctrl/Cmd+Z)"
            >
              ↶ Undo
            </button>
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
              <div className="keyboard-hint">
                <span><kbd>←</kbd>Pass</span>
                <span><kbd>↑</kbd>Love</span>
                <span><kbd>→</kbd>Keep</span>
                <span><kbd>{"⌘/Ctrl"}Z</kbd>Undo</span>
              </div>
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
            narrow={narrowMode}
            onToggleNarrow={setNarrowMode}
            onGenerate={generate}
          />
        </div>
      )}

      {showTasteFile && (
        <TasteFileModal
          taste={state.taste}
          tokens={tokens}
          hue={hue}
          swipeCount={state.swipes.length}
          onClose={() => setShowTasteFile(false)}
        />
      )}
      {showHistory && (
        <SwipeHistoryModal
          swipes={state.swipes}
          onRemove={removeSwipe}
          onClose={() => setShowHistory(false)}
        />
      )}
      {showClients && (
        <ClientSwitcherModal
          profiles={profileStore.profiles}
          activeId={profileStore.activeId}
          onSwitch={switchClient}
          onCreate={addClient}
          onRename={renameClient}
          onDelete={removeClient}
          onClose={() => setShowClients(false)}
        />
      )}
      {undoNotice && (
        <div className="undo-toast" role="status" aria-live="polite">
          ↶ Last swipe undone
        </div>
      )}
    </div>
  );
}
