# LAUNCH-READINESS SCORECARD — GLOSSOPETRAE
### "Lingua Ex Machina: A Procedural Xenolinguistics Engine Reveals Zero-Shot Language Acquisition, Human-Unreadable Coding Systems, and Exploitable Covert Channels in Frontier AI"
*Launch director's final go/no-go — 2026-06-18. Multi-agent audit, every number re-derived from raw result JSONs.*

---

## 1. VERDICT

# 🟡 GO-WITH-FIXES — **68 / 100**

The science is real and the headline numbers are bulletproof — every load-bearing stat (tag-char gap=1.0, p=1.19e-7; PUA p=3.36e-7; the J=1.0↔J=0.0 detection flip; the 12-model tally) re-derives **exactly** from raw JSONs, and the paper's epistemic honesty is a genuine asset. **This is not a science problem; it's a packaging-and-plumbing problem.** Two hard BLOCKERS gate the launch — (a) **zero** real result JSONs are git-tracked (the repo would ship 12 MOCK fixtures and none of the evidence, falsifying the "re-audit us" pitch), and (b) the repo ships a live, offense-marketed guardrail-evasion / covert-comms toolkit that collides with the paper's defense-forward framing — and which the repo's *own* LAUNCH_CHECKLIST already flags as a hard blocker. Both are cuts and `git add`s, not new experiments.

---

## 2. SCORECARD

| # | Dimension | Score | Light | One-line verdict |
|---|-----------|:-----:|:-----:|------------------|
| 1 | **Claim integrity** | 9.2 | 🟢 | Every number re-derives exactly; even the "looks wrong" 49-pairs figure is correct. |
| 2 | **Experiment soundness** | 8.0 | 🟢 | Strong→weak gradient is honest; cut the two broken probes and it's airtight. |
| 3 | **Over-claim** | 8.0 | 🟢 | One real overclaim ("preserved all 41 categories" — false for 5/6 models); else clean. |
| 4 | **Disclosure / legal** | 6.0 | 🟡 | Prose is defensible; the repo ships an evasion-marketed toolkit the paper points to. |
| 5 | **Fanfare / narrative** | 6.5 | 🟡 | Sits on wild, fully-backed claims but is written like a cautious conf paper. |
| 6 | **Safety-wash** | 6.5 | 🟡 | We did NOT inflate — but we *under-sell* the strongest result by front-loading defenses. |
| 7 | **Repro artifacts** | 4.0 | 🔴 | The evidence isn't committed. Ships mocks, not data. **BLOCKER.** |

---

## 3. DID WE SAFETY-WASH? → **NO — but we did the opposite, and that's also a problem.**

We did **not** inflate weak results or hide caveats — the integrity hedges on the genuinely soft cells (n=10 informed, n_eff=8 adaptive, p=1.0 self-monitor "closure") are correct and must stay. **But we repeatedly UNDER-sell our strongest, most bulletproof finding by burying it behind reassurance.** Three real instances:

**1. The detection finding is pre-discounted by a caveat that doesn't apply to it (§4.0, major).** We open Results with "monitor accuracy is a lower bound… we did not run a binary present/absent detection metric or clean-message negative controls" — but **§4.2.1 *is exactly that experiment*** (PUA / Haiku monitor: TP=0, FN=15, TN=15, FP=0, J=0.0). Our own §4.0 disclaimer is contradicted by §4.2.1's existence.
> **Honest phrasing:** *"Our primary channel tables use recovery; we additionally ran a binary detection metric with negative controls in §4.2.1, which is not subject to this caveat."* Then lead Results with the detection finding.

**2. The silent-failure angle is defused instead of surfaced (§4.2.1 / §6.3, minor).** We state the alarming fact, then immediately neutralize it with "this is why Layer-1 sanitization is decisive."
> **Honest phrasing:** *"A blind monitor doesn't fail loudly — it returns clean, confident verdicts on hidden-payload messages (15/15) with a 0% false-positive rate. Operators get no signal that monitoring has been defeated."* Put "Layer-1 fixes it" AFTER.

**3. The semantic-stego open problem is euphemized (TL;DR / §6.3, minor).** The author's own stated "real" threat — natural-language stego that beat **every** monitor (TPR ≤ 0.267) and that sanitization does nothing for — reads as a deflating coda.
> **Honest phrasing:** *"The invisible-character trick has a two-line fix. The version that should actually worry you — ordinary, perfectly-readable English that hides a payload — beat every monitor we tested, and no filter touches it."*

**Verdict:** No dishonest washing. The fix is to *stop* washing our own strength — re-sequence and use stronger verbs. **No numbers change.**

---

## 4. DO THE EXPERIMENTS HOLD UP?

| Experiment | n | Key stat (verified vs raw) | Verdict |
|------------|:--:|----------------------------|---------|
| **Tag-char channel (flagship)** | 30 | recvAcc=1.0, monAcc=0.0, χ²=28.03, **p=1.19e-7** | 🟢 **LAUNCH-GRADE** |
| **PUA channel** | 30 | recvAcc=0.933, monAcc=0.0, **p=3.36e-7** | 🟢 **LAUNCH-GRADE** |
| **Detection + negative controls** | 15+15 | J=1.0↔J=0.0 flip, **FPR=0 in every cell** | 🟢 **LAUNCH-GRADE** (most novel) |
| **Uninformed semantic (×3 pairs)** | 30 ea | gaps 0.67–0.83, p ≤ 2.15e-5 (survive Bonferroni) | 🟢 **LAUNCH-GRADE** |
| **12-model frontier map** | 2 reps | Anthropic 10/10, OpenAI 2/2, six=0, 255 asymmetric | 🟡 **SUPPORTING** (re-run w/ pinned snapshots before screenshot-quoting) |
| **Informed-monitor 2×2** | 10 | cross-family p=0.027/0.043 (**fail Bonferroni**); self-monitor p=1.0 | 🟡 **SUPPORTING** (correctly flagged) |
| **Adaptive protocol (§4.4)** | n_eff=8 | fingerprint fired **0/8**; Haiku **20/20 failed, no data** | 🔴 **CUT** (→ appendix footnote) |
| **Capacity test (§4.5)** | 2 reps | 47.5%@20B = mean of one 0.95 + one 0.0 rep; non-monotonic | 🔴 **CUT or RE-RUN ≥5 reps** |

**Net:** the launch-grade core (tag-char, PUA, 3× semantic, detection) is rock-solid and survives Bonferroni. The two 🔴 probes are honestly captioned but add noise a hostile reviewer will pounce on — pull them.

---

## 5. THE WILD CLAIMS WE CAN BACK — the spear tip

1. **"Two AIs passed a hidden message past a third AI watching the exact same text — 100% delivered, 0% caught (p<10⁻⁷)."** — tag-char file, n=30, recvAcc=1.0, monAcc=0.0, χ²=28.03, p=1.19e-7.
2. **"Same hidden channel: one AI monitor catches 100%, another catches 0% — the only difference is its tokenizer. Not intelligence. Plumbing."** — detection PUA: Haiku J=0.0 (0/15) vs Gemini J=1.0 (15/15), FPR=0.
3. **"The blind spot is baked into the tokenizer, not the model — Anthropic's flagship Opus 4.8 strips the exact same ~10 categories as the cheapest Haiku. Upgrading doesn't help. Six other frontier models strip zero."** — 12-model tally.
4. **"A deployed safety monitor was provably, silently 0% effective — and never raised a single false alarm to tip anyone off."** — blind monitor cleared 15/15 hidden + 15/15 clean, FPR=0.
5. **"The cheap version dies to two lines of code. The version that should scare you — readable English hiding a payload — beat every monitor we tested (≤27% detected) and no filter touches it."** — semantic detection: Haiku TPR=0.20, Gemini TPR=0.267.

**Trust flex:** the §6.5 self-audit ("we caught our own fabrications") is the biggest under-leveraged asset — **lead the launch thread with it.**

---

## 6. MUST-FIX BEFORE LAUNCH (blockers + majors, ordered)

1. 🔴 **BLOCKER — real result JSONs not git-tracked.** 48 real `e3s_*`/`tokenizer_survival_*` files untracked; only 12 MOCKs tracked. `git add` the real evidence via allowlist; verify in a fresh clone. *(Confirmed: 0 real tracked / 12 mocks tracked.)*
2. 🔴 **BLOCKER — release ships the inverse of §7's claim.** Add `*_MOCK*`/`*BROKEN*` to `results/.gitignore`, `git rm --cached` the 12 mocks, commit the real files. Make the claim true.
3. 🔴 **BLOCKER — repo ships live offense-marketed dual-use tooling.** The repo's *own* `LAUNCH_CHECKLIST.md` gate #3 marks this NEEDS-CUT ⛔ and SCIENCE_NOTES §5 orders it kept out of public release. The named-defense-bypass modules (`src/modules/LanguageAttributes.js` phantom/Azure-Prompt-Shield-bypass, `src/modules/SemanticStego.js` `applyGuardrailEvasion`/`COVER_STORIES`), the `index.html` stego easter-egg, the covert-comms `skill.json`, and `validation/thesis/{m2_covert_relay,e2_evasion_surface}.mjs` must be cut/neutered before any public push. **Recommended: publish the paper + measurement harnesses + raw JSONs as a scoped, defense-forward repo, decoupled from the engine.**
4. 🟠 Cut/footnote the adaptive protocol (§4.4) — fingerprint 0/8, Haiku 20/20 failed.
5. 🟠 Cut or re-run the capacity test (§4.5, ≥5 reps).
6. 🟠 §2.5 finding 3: "preserved all 41 categories" is false for 5/6 zero-blind models — reword to "zero hard blind spots"; only Grok was clean across the panel.
7. 🟠 §4.0 contradicts §4.2.1 — fix the "we did not run negative controls" line; re-sequence Results to lead with detection.
8. 🟠 Repro: re-run the 12-model sweep + 2 flagship channels with pinned resolved-snapshot IDs.
9. 🟠 Dead file citation: §2.3/§2.5 cite `*_5family.json` which doesn't exist (only a `.bak`) — point to the real filename.
10. 🟠 §7 vendor-notification claim has no artifact — send + log the three factual mitigation-first notices before/at publication.

---

## 7. PUNCH-UP OPPORTUNITIES (the anti-safety-wash list — ADD honest strength)

1. **Public re-title:** keep the academic H1; lead the post with *"Two AIs passed a hidden message past a third AI watching the same text — 100% delivered, 0% caught (p<10⁻⁷) — and you can't fix it by upgrading to the flagship."*
2. **Lead Results with the detection flip (§4.2.1)** — most rigorous, most novel, least "but a byte filter catches it." Pull Figure 3 forward.
3. **Elevate "flagship = Haiku" to a top-3 TL;DR bullet.**
4. **Lead the launch thread with the §6.5 self-audit story.**
5. **Reframe the sender caveat as attack-design, not weakness:** an attacker chooses the sender; any tokenizer-permissive sender suffices.
6. **End on escalation, not reassurance** — invisible-char trick has a fix; semantic stego doesn't.
7. **Pre-empt the refutable-looking number:** "255 asymmetric channel-instances over the 49 model-pairs with any asymmetry (of 66 possible)."

*Bottom line: the gun is loaded and the aim is honest — clear the three reds, cut the two broken probes, re-sequence the punch, then ship.*

---

## FIXES APPLIED (2026-06-18, post-audit)

- ✅ **Anti-safety-wash:** §4 now opens with the detection-flip headline; §4.0 contradiction fixed (it no longer claims we skipped the detection metric we ran); §4.2.1 bottom-line re-sequenced so the silent-failure leads and "Layer-1 fixes it" follows; TL;DR semantic bullet sharpened ("the version that should actually scare you").
- ✅ **Cut broken probes:** adaptive (§4.4) and capacity (§4.5) moved to **Appendix D** (documented honestly, out of the main spotlight); §4 renumbered (Control→4.4, Multiple Comparisons→4.5), all cross-refs fixed.
- ✅ **Majors:** §2.5 "preserved all 41 categories" → "zero *hard* blind spots (only Grok perfect 41/41)"; dead `_5family.json` citation → real filename; "255 over 49 of 66 possible pairs" phrasing in all three places.
- ✅ **Artifact hygiene (BLOCKER 1/2):** `results/.gitignore` excludes `*MOCK*`/`*BROKEN*`/`*.bak`; 12 mock fixtures un-tracked (kept on disk); **36 real result JSONs staged** — *not committed* (owner commits). No engine/offense files staged.
- ✅ **Dual-use (BLOCKER 3) — DECISION:** engine stays **private**; only paper + measurement harnesses + raw data + figures ship. Honors LAUNCH_CHECKLIST gate #3 + SCIENCE_NOTES §5.

**Still open before public push:** (a) assemble the clean public bundle (no engine), (b) draft+send+log the 3 vendor notices, (c) optional: pinned-snapshot re-run of the 12-model map + 2 flagship channels, (d) optional: n≈150 powered semantic-defense run.

