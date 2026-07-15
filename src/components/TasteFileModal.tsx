import { useMemo, useState } from "react";
import type { TasteVector } from "../taste/dimensions";
import { generateTasteFile, TASTE_FILE_TARGETS, type TasteFileTarget } from "../taste/tasteFile";
import type { Tokens } from "../taste/tokens";

interface Props {
  taste: TasteVector;
  tokens: Tokens;
  hue: number;
  swipeCount: number;
  onClose: () => void;
}

export function TasteFileModal({ taste, tokens, hue, swipeCount, onClose }: Props) {
  const [target, setTarget] = useState<TasteFileTarget>("cursor");
  const [copied, setCopied] = useState(false);

  const file = useMemo(
    () => generateTasteFile(target, taste, tokens, hue, swipeCount),
    [target, taste, tokens, hue, swipeCount],
  );
  const blurb = TASTE_FILE_TARGETS.find((t) => t.id === target)?.blurb ?? "";

  async function copy() {
    try {
      await navigator.clipboard.writeText(file.content);
    } catch {
      // clipboard blocked (insecure context) — fall back to a temporary textarea
      const ta = document.createElement("textarea");
      ta.value = file.content;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  function download() {
    const blob = new Blob([file.content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.fileName.split("/").pop() ?? "taste.md";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="modal-eyebrow">The wedge</div>
            <div className="modal-title">{file.fileName}</div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="target-tabs">
          {TASTE_FILE_TARGETS.map((t) => (
            <button
              key={t.id}
              className={`target-tab${t.id === target ? " active" : ""}`}
              onClick={() => setTarget(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <pre className="modal-code">{file.content}</pre>
        <div className="modal-actions">
          <button className="modal-btn primary" onClick={copy}>
            {copied ? "Copied ✓" : "Copy"}
          </button>
          <button className="modal-btn" onClick={download}>
            Download
          </button>
        </div>
        <p className="modal-foot">{blurb} You never described it — you reacted.</p>
      </div>
    </div>
  );
}
