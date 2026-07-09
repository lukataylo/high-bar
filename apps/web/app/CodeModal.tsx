"use client";

import { Check, Copy, FileCode2, X } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * A single attached code example. Mirrors the `CodeExample` shape in
 * `@high-bar/core` contracts (language + optional filename + code), kept local
 * so the web app carries no extra package dependency.
 */
export type CodeExample = {
  language: string;
  filename?: string;
  code: string;
};

type CodeModalProps = {
  examples: CodeExample[];
  open: boolean;
  onClose: () => void;
  title?: string;
};

function tabLabel(example: CodeExample, index: number): string {
  if (example.filename) return example.filename;
  return `${example.language || "code"} ${index + 1}`;
}

export function CodeModal({ examples, open, onClose, title = "Attached code" }: CodeModalProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  // Reset to the first tab whenever the modal is (re)opened.
  useEffect(() => {
    if (open) {
      setActiveIndex(0);
      setCopied(false);
    }
  }, [open]);

  // Close on Escape and lock background scroll while open.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open || examples.length === 0) return null;

  const active = examples[Math.min(activeIndex, examples.length - 1)];

  async function copyActive() {
    try {
      await navigator.clipboard.writeText(active.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div
      className="code-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div className="code-modal" onClick={(event) => event.stopPropagation()}>
        <header className="code-modal-header">
          <div className="code-modal-title">
            <FileCode2 size={16} />
            <span>{title}</span>
          </div>
          <button
            type="button"
            className="code-modal-close"
            aria-label="Close code viewer"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </header>

        {examples.length > 1 ? (
          <div className="code-modal-tabs" role="tablist">
            {examples.map((example, index) => (
              <button
                key={`${tabLabel(example, index)}-${index}`}
                type="button"
                role="tab"
                aria-selected={index === activeIndex}
                className={`code-modal-tab${index === activeIndex ? " is-active" : ""}`}
                onClick={() => {
                  setActiveIndex(index);
                  setCopied(false);
                }}
              >
                {tabLabel(example, index)}
              </button>
            ))}
          </div>
        ) : null}

        <div className="code-modal-toolbar">
          <span className="code-modal-meta">
            {active.filename ? <code>{active.filename}</code> : null}
            <span className="code-modal-lang">{active.language || "text"}</span>
          </span>
          <button type="button" className="code-modal-copy" onClick={copyActive}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        <pre className="code-modal-pre">
          <code>{active.code}</code>
        </pre>
      </div>
    </div>
  );
}

export default CodeModal;
