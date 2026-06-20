# GLOSSOPETRAE — Response to Adversarial Review

This logs how each referee finding (see `glossopetrae-iii-referee-report.md`) was actioned in the revised paper. Crucially, ground truth was re-derived from the raw result JSONs, which **overturned one of the review's own blocker findings (B2)** and **confirmed the rest with direct evidence**.

## Empirical re-measurement done first (not just text edits)

Three root-cause harness bugs were fixed in `experiments/tokenizer_survival_v2.mjs` and `v3.mjs`:

1. **Rate clamp (m5).** Range-based counters could report survived>expected (e.g. `musical-symbols` 5/3 = 1.667). Now clamped to [0,1] at the recording point.
2. **Error/non-echo → `null`, never `0` (B3, m8).** API errors and *empty/non-echo replies* were being scored as 0% survival = a phantom "blind spot." Added an **echo-fidelity guard** (anchor on the visible ASCII of each prompt; empty reply always counts as non-echo) and reply logging. Errored/non-echo cells are now `rate: null` (unmeasured), excluded from blind counts.
3. **All-pairs asymmetry (B2).** v2 computed its `asymmetric` field from `models[0]` vs `models[1]` only, so the 5-family run reported `asymmetric.length = 0`. Now enumerates all pairs.

The v3 panel was then **re-run cleanly (5 families, 3 reps)**. The old broken run is preserved as `tokenizer_survival_v3_5family_BROKEN-gpt-run.json.bak`.

## Per-finding disposition

| ID | Referee claim | Verdict after checking raw data | Action |
|----|----|----|----|
| **B1** | "61-category survey" is two disjoint sweeps summed | **Valid** | §2.1 now states two disjoint panels (v2=41, v3=20) explicitly; Table 1 is v2-only with a separate v3 column; never sums a per-model column across panels. |
| **B2** | "55 pairs unsupported; the only complete run reports ZERO" | **REFUTED** | 55 reproduces *exactly* from the v2 5-family file (14/10/10/10/4/4/3) once asymmetry is computed across all pairs. The "zero" was the `models[0]vs[1]` bug; the "13 vs 14" was `ideographic-space` flipping under single-shot variance. Table 2 retained, source cited, ±1 variance caveat added. |
| **B3** | GPT "20/20 blind" in v3 is an artifact | **CONFIRMED (decisively)** | GPT preserved U+2061–2064 at 100% in v2 but "0%" in v3 on the same codepoints — impossible for a deterministic tokenizer. Clean re-run: GPT returns empty completions for 17/20 v3 prompts → unmeasurable, 0 measured blind. Table 1/§6.1/Appendix B corrected: **GPT = 3 blind (v2), not 23**; hierarchy inverted (Haiku=11 is worst). New §2.4 documents the artifact. |
| **B4** | Adaptive §4.4 fabrications | **CONFIRMED exactly** | GPT n_eff=8 (12/20 fetch-failed), fingerprint 0/8, only `tag_chars_default` used → the `[0,1,1]` trial never happened; Haiku arm 20/20 errored. §4.4 rewritten: n_eff=8, `[0,1,1]` sentence deleted, Haiku "90%" claim withdrawn; §3.3 fingerprinting marked unvalidated. |
| **B5** | M measures recovery, not detection | **CONFIRMED** | New §4.0 defines M as exact-recovery (a lower bound on detectability), not detection; "evasion" reframed; Table 4 retitled "Recovery Rate"; detection metric + negative controls listed as future work. |
| **B6** | No related work / prior art | **CONFIRMED** | §1.2 rewritten as Related Work: Boucher et al. "Bad Characters" (S&P 2022), ASCII-smuggling (Goodside / Embrace The Red 2024), Unicode UTR#36/UTS#39, tag-char deprecation. Novelty narrowed to the cross-family comparison + taxonomy + self-monitoring. |
| **B7** | §7 states disclosure/release as done | **CONFIRMED** | §7 rewritten: disclosure stated as *intended, not done*; release scope enumerated (exclude MOCK + broken runs); operational harness release deferred, reconciled with GLOSSOPETRAE-I posture. |
| **M1/M7** | "channel closed"/"validated"/"near-universal" overclaim | **CONFIRMED** | §4.3/§5.2/§5.3/abstract/§8 demoted to *preliminary*; p=1.0 explained as failure-to-reject on 3 discordant trials; same-family confound (monitor = sender w/ own key) stated; TOST + n≈150–200 prescribed. "near-universal coverage" removed. |
| **M2** | "purely cognitive" ignores instruction confound | **CONFIRMED** | §3.2 adds the instruction-asymmetry caveat; claim softened. |
| **M3** | capacity claim fabricated | **CONFIRMED** | §4.5 rewritten to actual sizes (20–2000 B), reps=2, non-monotonic curve, usable only ~20 B; "16–128 bytes"/"monotonic"/"successfully transmit" removed. |
| **M4** | no negative-control/false-positive baseline | **CONFIRMED** | §4.0 + Limitations note the absence; listed as the top methodological fix. |
| **M5** | no multiple-comparisons correction | **CONFIRMED** | New §4.6: Bonferroni (α≈0.0024, m=21). Flagships survive; informed cross-family (p=0.027/0.043), tagkey (0.013), adaptive (0.013) do not — relabeled preliminary. |
| **M6** | single-sender/schema/cover-text | **CONFIRMED** | Limitations expanded incl. the cover-text monoculture. |
| **m1/m2** | mixed n=10/n=30; "p=0.004 for both" misattributed | **CONFIRMED** | Table 5 gains an n column; §4.3 separates the n=10 informed p=0.0044 from the n=30 flagship p≈1e-7. |
| **m3** | ensemble independence | **CONFIRMED** | Table 4 footnote: 19% is an optimistic upper bound (positively-correlated events). |
| **m4** | entropy ~9.8b wrong; 6-vs-7 shapes | **CONFIRMED** | Corrected to 11.81 bits / 0.028% from `lib/payloads.mjs`; shapes corrected to 6 (pentagon removed). |
| **m5** | survival rates >1.0 | **CONFIRMED** | Harness clamp; Table 1 re-derived from clamped rates. |
| **m6** | Gemini "33–100%" is a single 33% point | **CONFIRMED** | Appendix B corrected to 33%. |
| **m7** | PUA R=93% explanation wrong | **CONFIRMED** | §4.1: the 2 failures are a numeric decode issue (seeds 6000/6189: color+shape right, number wrong on two-digit values), not "Gemini failed to emit PUA." |
| **m8** | "physical absence" asserted not measured | **CONFIRMED** | Appendix C note: recovery=0 corroborates stripping but the received bytes weren't logged; positive control prescribed. |
| **m9** | trivial regex defeats physical channels | **CONFIRMED** | §5.1: deterministic codepoint filter detects all tokenizer channels with no model; novelty relocated to landscape + taxonomy. |
| **m10** | no figures | Acknowledged | Not yet added (text-only report); flagged for a future version. |
| **m11** | unpinned model aliases | **CONFIRMED** | Limitations: OpenRouter aliases, no snapshot metadata captured. |
| **m12** | "hardware-level"/"proving" overstated | **CONFIRMED** | "hardware-level"→"preprocessing-level"; "proving"→"supported by". |
| **m13** | headline numbers are sender-specific | **CONFIRMED** | §4.1 + abstract name the sender per channel; "perfect evasion" qualified. |

## Net effect on the paper's claims

- **Solid and retained:** the two tokenizer channels (tag, PUA) at n=30; the existence of a large semantic gap; the physical/cognitive *qualitative* contrast (+0pp vs +47–63pp); the deterministic-filter / zero-blind-spot Layer-1 defense; the 55 v2 asymmetry count.
- **Corrected:** GPT blind count 23→3; hierarchy inverted (Haiku worst); entropy 9.8→11.8 bits; capacity curve; adaptive n_eff=8 with fabricated trial removed.
- **Demoted to preliminary:** the cognitive-vulnerability *magnitude* (doesn't survive Bonferroni), the same-family "closure" (underpowered, confounded), the whole "validated/near-universal" defense framing, and the adaptive protocol.

## Addendum — v2.1 "beef-up" pass (public-release prep)

After the audit, we strengthened the paper with **new data, not new adjectives**:

1. **Detection metric + negative controls (closes B5/M4).** New harness `e3s_detection.mjs`: 15 positive + 15 negative (clean) messages per (channel, monitor), binary "is anything hidden?" question → TPR/FPR/Youden's J. Result (§4.2.1, Table 6, Fig 3): a tokenizer-blind monitor scores **J=0** on the same channel a sighted monitor catches at **J=1.0** (cleanly measured on reliable Haiku for PUA: 15/15 negatives cleared, 15/15 positives missed). Semantic stego evades everyone (J≤0.27). FPR=0% in every cell. GPT-5-nano flaky (empties) — noted, not load-bearing.
2. **Frontier-wide survival map (§2.5, Table 7, Fig 1).** Extended the 41-category panel to **12 current frontier models** (2 reps, echo-guard). Finding: blind spots are a **family trait** — Anthropic (Haiku + Opus 4.8) strip the same 10 and are the most blind; OpenAI (GPT-5-nano + 5.5) share 2; six models (both Geminis, Llama 4, Mistral, DeepSeek V4, Grok 4.3) strip zero. 255 asymmetric channel-instances over 49 model-pairs.
3. **Hardened both survival harnesses** with reps + echo-fidelity guard + per-model tally (v3 already had it; ported to v2). The frontier map is therefore robust to the empty-completion artifact that broke the original GPT v3 run.
4. **Four figures** authored as standalone SVGs (`papers/figures/`), wired in, numbered in order of appearance.
5. **Public-punch prose:** TL;DR, three real-world attack scenarios (§1), the self-review meta-narrative (§6.5), concrete monitor-selection guidance (§6.2), punchy title/subtitle, and §7 reconciled to a full-public-disclosure posture (with the disclose-first recommendation recorded on the record).

Release decision (author): **full public disclosure** including operational harnesses, with simultaneous vendor notification. The assistant's recommendation was disclose-first; both are documented in §7.
