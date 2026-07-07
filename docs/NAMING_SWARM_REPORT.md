# Naming swarm report — renaming "Skill Doctor"

**Run date:** 2026-07-07
**Brief:** name the agent-skill diagnostics/repair tool currently shipped as "Skill Doctor" (converts, audits, rewrites, and validates SKILL.md agent skills across Claude Code, Claude.ai, and Codex CLI).
**Method:** 5 independent generator agents (one lens each, no shared context) → deterministic frequency + morpheme clustering → 24-name shortlist → 4 web-research agents for domain/collision checks → orchestrator scoring.
**Scale:** 130 names generated, 104 unique, 24 researched.

---

## 1. What the frequency clustering caught

Independence between generators turns agreement into a signal: a name that several
agents produce independently is the "AI-consensus" pick — the thing every model
reaches for first, and therefore the least ownable.

**Cross-agent recurrers (demoted, not shortlisted):**

| Name | Hit by | Name | Hit by |
|---|---|---|---|
| fettle | 4 of 5 generators | vernier, loupe, vitals, anneal | 2 |
| hone, assay, sonde, caliper, splint | 3 | plumb, fletch, whet, refit, attune | 2 |
| emend, tare, triage, galen | 2 | | |

The consensus vein for this brief is **whetstone/measuring-instrument English words**
(hone, whet, caliper, vernier, gauge) plus **clinical triage words** (triage, vitals,
splint). If you've seen an AI-named dev tool that sounds like that, this is why —
treat that whole register as crowded.

**Morpheme analysis:** no 3–5 letter fragment appeared in ≥4 distinct names, so no
over-mined suffix vein (no `-ly/-ify/-io` stacking) — the lens separation worked, and
the pool is mostly real words rather than morpheme mashups.

Also demoted by judgment despite single-generator status: `forge`, `anvil`, `gauge`,
`probe`, `pulse`, `polaris` — generic dev-tool furniture with heavy existing use.

---

## 2. Ranked finalists

Scores are 1–5: **Fit** (evokes diagnose/repair/validate skills), **Distinctiveness**
(inverse of the clustering signal + real-world crowding), **Availability** (domain
path + collision picture, from live web checks — no true WHOIS, so availability is
inferred, not guaranteed).

| # | Name | Meaning / fit | Dist. | Domain + collisions | Verdict |
|---|------|----------------|-------|----------------------|---------|
| 1 | **kothar** | Ugaritic craftsman-god of skill itself — a deity whose literal domain is skill, for a tool that fixes skills | 5 | .com unused (503); kothar.dev/.io likely open; only tiny "Kothar Labs/Tech Solutions" traces | ★★★★★ Fit 5 · Dist 5 · Avail 4 |
| 2 | **seibi** (整備) | Japanese: maintenance, servicing, precise tuning — quiet, workshop-accurate | 5 | .com parked/unused; .dev/.io/.ai look clean; zero collisions found | ★★★★★ Fit 4 · Dist 5 · Avail 5 |
| 3 | **eshmun** | Phoenician god of mending and restoration | 5 | .com parked for sale (Afternic premium); .dev/.ai likely open; no collisions found | ★★★★ Fit 4.5 · Dist 5 · Avail 3.5 |
| 4 | **thuban** | The forgotten pole star — the original true north, for a tool that re-trues drifting skills | 5 | .com suspended/inactive; only a 2011 GIS project shares the name | ★★★★ Fit 3.5 · Dist 5 · Avail 4 |
| 5 | **kalib** | Clipped "calibrate" — dialing triggers to spec | 4 | kalib.com looks unclaimed/minimal; kalibra.ai/kalibr.systems nearby but distinct | ★★★★ Fit 4 · Dist 4 · Avail 4 |
| 6 | **sarto** | Italian: tailor — one who measures, refits, and mends to fit | 4 | .com unclear (503); sarto.dev is a personal portfolio; sarto.ai is a clothing-fit startup (different category) | ★★★ Fit 3.5 · Dist 4 · Avail 3.5 |
| 7 | **temper** | Hardens a skill against over-triggering | 3 | .com held by an unrelated industrial distributor; temper.dev plausibly free; temper.works exists | ★★★ Fit 4 · Dist 3 · Avail 3 |
| 8 | **recast** | Exactly what the converter does — restructure for any agent | 3 | .com unclear; crowded "Recast" field in dev/AI (npm recast, Recast.AI, Recast Studio) | ★★ Fit 4.5 · Dist 3 · Avail 2.5 |

---

## 3. Avoid — brand collisions found by the research swarm

| Name | Collision | Severity |
|------|-----------|----------|
| stet | **stet.sh — an active AI coding-agent eval tool.** Same category. | Kill |
| togi | Togi — workflow-automation startup **with a Claude Code plugin**. Same category. | Kill |
| vetric | vetric.io — active developer-tool (data pipeline) startup | Kill |
| sinter | sinter.tech — active developer platform; Trail of Bits "Sinter" security tool | Kill |
| verix | GitHub "Verix" AI code review + verix.ai + established pharma-tech Verix | Kill |
| pyxis | NVIDIA Pyxis (container plugin), BD Pyxis MedStation; .com locked by BD | Kill |
| splice | Splice Inc. — major venture-backed music platform with gen-AI features | Kill |
| shindan | shindan.io — active mobile-security company (tech-adjacent) | High |
| basanos | Basanos — Norwegian startup-validation platform | High |
| alcor | Alcor Solutions/Technical/BPO cluster + Alcor cryonics | High |
| airmed | AirMed International (medical transport), AirMed Cloud (cannabis software) | High |
| kerf | kerf time-series database; kerf.com priced at ~$285k | Med |
| trig | trig.com design agency; Triggre no-code platform adjacent | Med |
| curo / honix / bryne | fragmented existing brands (finance/wellbeing; ingredients supplier; Byrne Inc + Norwegian town) | Med |

---

## 4. Recommendation

**Cleanest domain path: `seibi`** — zero collisions anywhere, .dev/.io/.ai all look
open, and "maintenance/precise tuning" is exactly the product, in the quiet
craft-Japanese register (kaizen, kanban) developers already respect.

**Richest brand story: `kothar`** — the craftsman god whose literal domain is *skill*,
fixing skills. One-sentence brand story, near-zero crowding, 6 letters, types well.

**Single pick: `kothar`** (`kothar.dev`, CLI `kothar`, `npx kothar fix ./skills`). It
carries the story `seibi` lacks while staying essentially as clean; fall back to
`seibi` if the .com matters and Kothar's Afternic-free path doesn't check out under a
real WHOIS + USPTO/App Store/GitHub-org pass on both (recommended next step before
committing).

---

## Appendix A — shortlist research detail (raw researcher output)

```
bryne | PREMIUM-TAKEN | active business (Byrne Inc., est. 1970) | .dev/.app unclear | Byrne Inc. (battery charging/design company) | Established brand, not tech-focused
togi | COLLISION-RISK | unclear/503 error | .io/.app unclear | Togi (Israeli workflow-automation startup, App Store presence) | Active platform with Claude Code plugin
seibi | AVAILABLE-ISH | parked/unused | .dev, .io, .ai | None (means "maintenance" in Japanese) | Minimal footprint; clean for developer tools
shindan | COLLISION-RISK | for-sale (GoDaddy parked) | .io taken by company | Shindan (active mobile security company, shindan.io) | Active business; name contested
basanos | COLLISION-RISK | for-sale ($895 HugeDomains) | .no, .ai, .io available | Basanos (active Norwegian startup-validation platform) | Live at basanos.no/basanos.net; name collision
sarto | AVAILABLE-ISH | unclear/503 error | .dev, .io | Sarto.ai (NYC clothing-fit startup, 2023) | sarto.dev is personal portfolio; weak AI collision
stet | COLLISION-RISK | parked | .co or .ai | stet.sh (active AI coding agent eval tool), Stetho (Facebook Android debugger), stet.io (image editor) | stet.sh is direct competitor in AI agent diagnostics space
kerf | PREMIUM-TAKEN | for-sale ($285k on GoDaddy) | .io or .co (guess) | kerf (open-source columnar time-series database) | Expensive; kerf identity linked to database project
sinter | COLLISION-RISK | for-sale (Sedo) | .app (guess) | sinter.tech (active developer platform), Trail of Bits Sinter | For-sale + direct competitor in developer tools
splice | PREMIUM-TAKEN | active (Splice Inc. music platform) | n/a | Splice (major venture-backed music production platform) | Established company; no path to ownership
temper | PREMIUM-TAKEN | active (Temper Technical Marketing Inc, industrial) | .dev or .app (guess) | temper.works (app exists) | .com owned by unrelated industrial distributor; alt TLDs likely viable
recast | AVAILABLE-ISH | parked or possibly for-sale (HTTP 503) | .dev or .app (guess) | Recast.AI (defunct), getrecast.com (active), npm recast, Recast Studio | Moderate collision risk from multiple "Recast" products in dev/AI
kalib | AVAILABLE-ISH | unused/placeholder page | .io, .dev, .ai | calib.io (camera calibration); kalibra.ai, kalibr.systems distinct | No prominent collision with developer tools
verix | PREMIUM-TAKEN | active pharma tech company | .dev, .ai | verix.ai, verix.io, GitHub Verix (AI code review) | Multiple Verix products create collision risk in AI/dev space
vetric | COLLISION-RISK | HTTP 503 (unclear) | .dev, .ai, .app | Vetric (vetric.io) active data-pipeline developer tool | Direct dev-tool collision
honix | PREMIUM-TAKEN | active bulk ingredients business | .io, .dev, .ai | HONIX Technologies appears distinct | No dev-tool collision but .com premium-held
curo | PREMIUM-TAKEN | redirects to attainfinance.com | .dev, .io, .ai | Curo wellbeing, Curo EV charging, Curo International | Brand fragmentation
trig | PREMIUM-TAKEN | active design/innovation firm | .dev, .io, .ai | Triggre (no-code platform, similar name) | trig.com held by design agency
kothar | AVAILABLE-ISH | 503 (unused/inaccessible) | .dev or .net; .app/.io likely open | Kothar Labs, Kothar Tech Solutions — minor | Minimal collision risk
thuban | AVAILABLE-ISH | account suspended (inactive) | .dev/.app/.io likely open | Thuban GIS software (2011, Intevation) | Older project; low collision risk
alcor | COLLISION-RISK | active (Alcor recruitment/EOR) | .dev or .app | Alcor Solutions/Technical/BPO/Infotech; Alcor cryonics | Multiple established businesses
airmed | COLLISION-RISK | active (AirMed International + AirMed Cloud) | .dev or .ai | Medical transport + cannabis software brands | Strong existing brand presence
eshmun | AVAILABLE-ISH | parked for sale (Afternic premium) | .dev or .ai likely | None significant | Clean name; .com is a premium listing
pyxis | PREMIUM-TAKEN | held by Becton Dickinson (since 1999) | .app/.io/.ai maybe | NVIDIA Pyxis, BD Pyxis MedStation, Pyxis Mobile, PYXiS Software | Strong collision risk
```

## Appendix B — full generation pool (130 names, 5 lenses)

**G1 · world languages:** hone, fettle, emend, assay, strop, tare, bryne, laga, bota, kintsugi, togi, takumi, shindan, naosu, seibi, cura, acuo, medeor, probo, faber, sarto, basanos, akone, kanon, sonde, nitido, schliff

**G2 · workshop/clinic metaphors:** Hone, Triage, Gauge, Vernier, Caliper, Forge, Anvil, Temper, Probe, Splint, Suture, Loupe, Fettle, Vitals, Pulse, Anneal, Burnish, Quench, Vise, Lathe, Rasp, Bevel, Splice, Stet, Sinter

**G3 · coined brandables:** Skiln, Honix, Kalib, Vetric, Verix, Curo, Acume, Fixel, Emend, Fettle, Splint, Sonde, Assay, Anneal, Plumb, Fletch, Whet, Trig, Refit, Attune, Gnosis, Vernier, Caliper, Salve, Toniq, Deft

**G4 · nature/myth/astronomy:** Yarrow, Chiron, Sirona, Airmed, Aceso, Salus, Paean, Eshmun, Heka, Galen, Comfrey, Arnica, Alcor, Thuban, Kochab, Alkaid, Canopus, Polaris, Cynosure, Pyxis, Caelum, Octans, Kestrel, Argus, Lynceus, Kothar

**G5 · best of any category:** fettle, sleight, hone, knack, splint, triage, loupe, assay, sonde, caliper, tare, plumb, fletch, kerf, whet, oncue, attune, trueup, refit, recast, vitals, clinic, galen, rubric, redline, metier
