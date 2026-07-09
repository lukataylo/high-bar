import { useState } from "react";
import type { TasteFile } from "../taste/tasteFile";

interface Props {
  file: TasteFile;
  onClose: () => void;
}

export function TasteFileModal({ file, onClose }: Props) {
  const [copied, setCopied] = useState(false);

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
    a.download = "taste.mdc";
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
        <pre className="modal-code">{file.content}</pre>
        <div className="modal-actions">
          <button className="modal-btn primary" onClick={copy}>
            {copied ? "Copied ✓" : "Copy"}
          </button>
          <button className="modal-btn" onClick={download}>
            Download
          </button>
        </div>
        <p className="modal-foot">
          Drop this in a repo and every Cursor agent build ships in your taste. You never described it — you reacted.
        </p>
      </div>
    </div>
  );
}
