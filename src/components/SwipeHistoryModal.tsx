import type { SwipeEvent } from "../taste/model";

interface Props {
  swipes: SwipeEvent[];
  onRemove: (index: number) => void;
  onClose: () => void;
}

const DIRECTION_LABEL: Record<SwipeEvent["direction"], string> = {
  like: "♥ Keep",
  pass: "✕ Pass",
  superlike: "★ Love",
};

export function SwipeHistoryModal({ swipes, onRemove, onClose }: Props) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="modal-eyebrow">Style saves</div>
            <div className="modal-title">
              {swipes.length} swipe{swipes.length === 1 ? "" : "s"}
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="history-list">
          {swipes.length === 0 ? (
            <p className="modal-foot">No swipes yet.</p>
          ) : (
            swipes
              .map((swipe, index) => ({ swipe, index }))
              .reverse()
              .map(({ swipe, index }) => (
                <div className="history-row" key={`${swipe.cardId}-${index}`}>
                  <span
                    className="history-swatch"
                    style={{ background: `hsl(${swipe.hue}, 70%, 55%)` }}
                  />
                  <span className="history-label">{DIRECTION_LABEL[swipe.direction]}</span>
                  <button
                    className="history-remove"
                    onClick={() => onRemove(index)}
                    aria-label="Remove this swipe from your taste"
                  >
                    remove
                  </button>
                </div>
              ))
          )}
        </div>
        <p className="modal-foot">
          Remove a card and your taste model relearns without its influence.
        </p>
      </div>
    </div>
  );
}
