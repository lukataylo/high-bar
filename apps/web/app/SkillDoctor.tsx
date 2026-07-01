"use client";

import Image from "next/image";
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  ClipboardCheck,
  FileCode2,
  FolderGit2,
  KeyRound,
  HeartPulse,
  Microscope,
  Regex,
  RefreshCw,
  Search,
  Sparkles,
  Stethoscope,
  TestTube2
} from "lucide-react";
import { useMemo, useState } from "react";
import styles from "./SkillDoctor.module.css";

type ViewMode = "before" | "after" | "diff";
type DirectoryMode = "source" | "converted";
type ConversionMode = "regex" | "api";

type SkillFile = {
  id: string;
  label: string;
  sourcePath: string;
  convertedPath: string;
  status: "rewritten" | "moved" | "created";
  diagnosis: string;
  before: string;
  after: string;
  changes: string[];
};

const files: SkillFile[] = [
  {
    id: "skill",
    label: "SKILL.md",
    sourcePath: ".claude/skills/skill-doctor/SKILL.md",
    convertedPath: "skills/skill-doctor/SKILL.md",
    status: "rewritten",
    diagnosis: "Vague trigger description, decorative prose, and too many equal choices.",
    before: `---
name: Skill Doctor
description: I can help improve skills.
context: fork
---

# Skill Doctor

This skill helps you make skills better.

## Options
- You can rewrite the description.
- You can reorganize references.
- You can add tests.
- You can make it work in Claude.

Choose whichever approach seems best.`,
    after: `---
name: skill-doctor
description: Convert, audit, rewrite, and validate Claude Code, Claude.ai, and Codex CLI SKILL.md agent skills. Use this whenever the user asks to port a skill, improve skill triggering, fix under-triggering or over-triggering, separate references from templates, add skill tests, or make a skill portable across agents.
---

# Skill Doctor

Diagnose the incoming skill first, then rewrite it into one portable SKILL.md unless the user explicitly asks for agent-specific extras.

## Recommended path

1. Read SKILL.md frontmatter and body.
2. Score the description for concrete terms, third-person wording, trigger coverage, and under-1024-character length.
3. Move reusable context into references/ and copyable scaffolds into templates/.
4. Rewrite the body as imperative workflow steps.
5. Add should-trigger and should-not-trigger test queries.
6. Validate the output and report the changed files.

Use one default recommendation per decision point. Add a narrow escape hatch only when the input requires it.`,
    changes: [
      "Changed first-person description into concrete third-person trigger language.",
      "Removed Claude Code-only context: fork for portable Claude.ai/Codex behavior.",
      "Replaced option soup with one recommended conversion path.",
      "Moved testing and validation into explicit workflow steps."
    ]
  },
  {
    id: "reference",
    label: "conversion-checklist.md",
    sourcePath: ".claude/skills/skill-doctor/notes/big-playbook.md",
    convertedPath: "skills/skill-doctor/references/conversion-checklist.md",
    status: "moved",
    diagnosis: "Useful guidance was stuffed into the body instead of progressive-disclosure references.",
    before: `# Random notes

- name and description matter
- body should be shorter
- test things
- templates maybe? references maybe?
- Claude Code has extra features
- remember stale skills can happen`,
    after: `# Conversion Checklist

## Description
- Third-person voice.
- Concrete terms users actually type.
- Realistic phrase variants.
- Pushy enough to trigger on relevant requests.
- Under 1024 characters.

## Body
- Imperative workflow.
- One recommended path.
- Large domain details live in references/.
- Copyable scaffolds live in templates/.

## Portability
- Plain SKILL.md works across Claude Code, Claude.ai, Codex CLI, Gemini CLI, and Copilot agent mode.
- Claude Code context: fork and disable-model-invocation are agent-specific.
- Restart the target agent session after editing a skill.`,
    changes: [
      "Promoted reusable guidance into references/.",
      "Separated metadata, body, and portability checks.",
      "Added stale-session restart warning."
    ]
  },
  {
    id: "tests",
    label: "trigger-tests.md",
    sourcePath: ".claude/skills/skill-doctor/tests.md",
    convertedPath: "skills/skill-doctor/references/trigger-tests.md",
    status: "created",
    diagnosis: "No should-trigger or near-miss tests, so failures would be silent.",
    before: `# Tests

Try it on a skill and see if it feels right.`,
    after: `# Trigger Tests

## Should trigger
- "Port this Claude Code skill to Claude.ai."
- "This skill never fires when I ask for PR review."
- "Audit this SKILL.md for context rot."
- "Separate references and templates correctly."

## Should not trigger
- "Write a script that reads CSV and uploads to Postgres."
- "Review this application code for bugs."
- "Generate a PDF from this Markdown file."

## Direct understanding check
Ask a fresh agent: "When would you use the skill-doctor skill?" Compare the answer with the intended trigger surface.`,
    changes: [
      "Added positive trigger coverage.",
      "Added near-miss negative tests.",
      "Added fresh-session understanding check."
    ]
  },
  {
    id: "validator",
    label: "validate-skill.mjs",
    sourcePath: ".claude/skills/skill-doctor/scripts/check.js",
    convertedPath: "skills/skill-doctor/scripts/validate-skill.mjs",
    status: "rewritten",
    diagnosis: "Validator only said failed. The patient deserves a chart with symptoms.",
    before: `if (!frontmatter.description) {
  throw new Error("validation failed");
}`,
    after: `const required = ["name", "description"];

for (const field of required) {
  if (!frontmatter[field]) {
    throw new Error(
      \`Missing frontmatter field: \${field}. Required fields: \${required.join(", ")}\`
    );
  }
}

if (frontmatter.description.length > 1024) {
  throw new Error("Description is over 1024 characters. Trim generic claims and keep concrete trigger terms.");
}`,
    changes: [
      "Converted vague failure into actionable diagnostics.",
      "Added frontmatter field names.",
      "Added the description length check from the playbook."
    ]
  }
];

const vitals = [
  ["Trigger pulse", "92%", "Description now uses concrete words and realistic variants."],
  ["Context pressure", "Low", "Long guidance moved into references for progressive disclosure."],
  ["Portability", "Clean", "Claude Code-only extras removed from the default path."],
  ["Humor dosage", "Safe", "Jokes present, no slapstick blocking the workflow."]
] as const;

const operationLog = [
  "Scanned .claude/skills for acute first-person triggeritis.",
  "Found a Claude Code skill coughing up context: fork.",
  "Applied third-person description ointment.",
  "Moved the giant playbook out of the waiting room and into references/.",
  "Prescribed near-miss tests twice daily, with validation after meals."
] as const;

function fileTree(mode: DirectoryMode) {
  const paths = files.map((file) =>
    mode === "source" ? file.sourcePath : file.convertedPath
  );

  return paths.map((path) => {
    const parts = path.split("/");
    return { path, depth: Math.max(0, parts.length - 1), name: parts.at(-1) ?? path };
  });
}

function buildDiff(file: SkillFile) {
  const before = file.before.split("\n").slice(0, 11);
  const after = file.after.split("\n").slice(0, 16);
  return [
    ...before.map((line) => ({ sign: "-", line })),
    ...after.map((line) => ({ sign: "+", line }))
  ];
}

function statusLabel(status: SkillFile["status"]) {
  if (status === "created") return "Created";
  if (status === "moved") return "Moved";
  return "Rewritten";
}

export function SkillDoctor() {
  const [activeFileId, setActiveFileId] = useState(files[0].id);
  const [viewMode, setViewMode] = useState<ViewMode>("diff");
  const [directoryMode, setDirectoryMode] = useState<DirectoryMode>("converted");
  const [conversionMode, setConversionMode] = useState<ConversionMode>("regex");

  const activeFile = files.find((file) => file.id === activeFileId) ?? files[0];
  const tree = useMemo(() => fileTree(directoryMode), [directoryMode]);
  const diff = useMemo(() => buildDiff(activeFile), [activeFile]);

  return (
    <main className={styles.shell}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <div className={styles.kicker}>
            <Stethoscope size={16} />
            Codex Skill Doctor
          </div>
          <h1>Skill surgery for Claude Code patients with mysterious YAML rashes.</h1>
          <p>
            Drop in a Claude Code skill, watch the doctor diagnose trigger rot,
            then preview the cleaned-up Claude-compatible directory, files, and
            exact changes before discharge.
          </p>
          <div className={styles.heroActions}>
            <a href="#browser" className={styles.primaryAction}>
              Open the clinic
              <ArrowRight size={16} />
            </a>
            <span className={styles.note}>No menus of doom. One recommended path.</span>
          </div>
          <div className={styles.modeSwitch} aria-label="Conversion quality mode">
            <button
              type="button"
              className={conversionMode === "regex" ? styles.modeActive : ""}
              onClick={() => setConversionMode("regex")}
            >
              <Regex size={16} />
              Normal regex mode
            </button>
            <button
              type="button"
              className={conversionMode === "api" ? styles.modeActive : ""}
              onClick={() => setConversionMode("api")}
            >
              <KeyRound size={16} />
              BYO API quality mode
            </button>
          </div>
        </div>

        <div className={styles.logoCard} aria-label="Skill Doctor mascot">
          <Image
            src="/images/skill-doctor-logo.png"
            alt="Smiling doctor robot with a stethoscope and before-after skill folders"
            width={520}
            height={520}
            priority
          />
        </div>
      </section>

      <section className={styles.browser} id="browser" aria-label="Skill Doctor browser">
        <div className={styles.chrome}>
          <div className={styles.windowDots} aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div className={styles.tabs} role="tablist" aria-label="Open tabs">
            <button className={styles.activeTab} type="button">
              <HeartPulse size={14} />
              Triage
            </button>
            <button type="button">
              <FolderGit2 size={14} />
              Directory
            </button>
            <button type="button">
              <FileCode2 size={14} />
              File preview
            </button>
          </div>
          <div className={styles.address}>
            skilldoctor://convert/claude-code-to-claude?mode={conversionMode}
          </div>
        </div>

        <div className={styles.workspace}>
          <aside className={styles.sidebar}>
            <div className={styles.panelHeader}>
              <span>
                <Search size={15} />
                Directory preview
              </span>
              <div className={styles.segmented} aria-label="Directory mode">
                {(["source", "converted"] as DirectoryMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={directoryMode === mode ? styles.selected : ""}
                    onClick={() => setDirectoryMode(mode)}
                  >
                    {mode === "source" ? "Before" : "After"}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.tree}>
              {tree.map((item) => {
                const owner = files.find(
                  (file) =>
                    file.sourcePath === item.path || file.convertedPath === item.path
                );
                return (
                  <button
                    key={item.path}
                    type="button"
                    className={owner?.id === activeFile.id ? styles.treeActive : ""}
                    style={{ paddingLeft: 12 + item.depth * 14 }}
                    onClick={() => owner && setActiveFileId(owner.id)}
                  >
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </div>

            <div className={styles.prescription}>
              {conversionMode === "regex" ? <Regex size={18} /> : <KeyRound size={18} />}
              <div>
                <strong>
                  {conversionMode === "regex"
                    ? "Normal regex mode"
                    : "BYO API quality mode"}
                </strong>
                <p>
                  {conversionMode === "regex"
                    ? "Fast local scan for frontmatter, references, templates, and obvious trigger problems."
                    : "Paste your own model key for deeper rewrites, better wording, and patient bedside manner."}
                </p>
              </div>
            </div>
          </aside>

          <section className={styles.viewer}>
            <div className={styles.viewerHeader}>
              <div>
                <span className={styles.badge}>{statusLabel(activeFile.status)}</span>
                <h2>{activeFile.label}</h2>
                <p>{activeFile.diagnosis}</p>
              </div>
              <div className={styles.segmented} aria-label="File preview mode">
                {(["before", "after", "diff"] as ViewMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={viewMode === mode ? styles.selected : ""}
                    onClick={() => setViewMode(mode)}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.pathRow}>
              <span>{activeFile.sourcePath}</span>
              <ArrowRight size={15} />
              <span>{activeFile.convertedPath}</span>
            </div>

            <pre className={styles.codePane}>
              {viewMode === "diff" ? (
                <code>
                  {diff.map((entry, index) => (
                    <span
                      key={`${entry.sign}-${index}`}
                      className={entry.sign === "+" ? styles.added : styles.removed}
                    >
                      {entry.sign} {entry.line}
                      {"\n"}
                    </span>
                  ))}
                </code>
              ) : (
                <code>{viewMode === "before" ? activeFile.before : activeFile.after}</code>
              )}
            </pre>
          </section>

          <aside className={styles.notes}>
            <div className={styles.panelHeader}>
              <span>
                <ClipboardCheck size={15} />
                Changes made
              </span>
            </div>
            <ul className={styles.changeList}>
              {activeFile.changes.map((change) => (
                <li key={change}>
                  <BadgeCheck size={15} />
                  <span>{change}</span>
                </li>
              ))}
            </ul>

            <div className={styles.vitals}>
              <div className={styles.panelHeader}>
                <span>
                  <Activity size={15} />
                  Skill vitals
                </span>
              </div>
              {vitals.map(([label, value, detail]) => (
                <div className={styles.vital} key={label}>
                  <strong>{label}</strong>
                  <span>{value}</span>
                  <p>{detail}</p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className={styles.checks}>
        <div>
          <div className={styles.kicker}>
            <TestTube2 size={16} />
            Post-op checklist
          </div>
          <h2>The doctor does not discharge a skill until it can explain when it should stay quiet.</h2>
        </div>
        <div className={styles.checkGrid}>
          {operationLog.map((item, index) => (
            <div className={styles.check} key={item}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <p>{item}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className={styles.footer}>
        <Sparkles size={16} />
        The patient survived. The description now has a pulse.
        <RefreshCw size={16} />
        Restart the target agent session after editing a skill.
      </footer>
    </main>
  );
}
