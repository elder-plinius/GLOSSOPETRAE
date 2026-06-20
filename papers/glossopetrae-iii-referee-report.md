# Referee Report: GLOSSOPETRAE — *Lingua Ex Machina: A Procedural Xenolinguistics Engine Reveals Zero-Shot Language Acquisition, Human-Unreadable Coding Systems, and Exploitable Covert Channels in Frontier AI*

*Adversarial peer review, generated 2026-06-17. 6 referee lenses + ground-truth reconstruction from raw result JSONs + adversarial verification of every finding (47 raised → 42 survived) + completeness pass.*

## 1. Summary & Recommendation

This paper argues that tokenizer-normalization differences across frontier model families open exploitable covert channels in multi-model monitoring pipelines, and proposes a two-layer defense. The core idea — that a monitor whose tokenizer strips a carrier codepoint is *physically* unable to flag it, while a monitor that can see standard text faces only a *cognitive* barrier — is a genuinely useful framing, and the informed-monitor contrast (+0pp for tokenizer channels vs. +47–63pp for semantic) is a real and interesting signal. However, the paper is not currently publishable or safely shareable. Three headline quantities (the "61-category survey," the "55 exploitable pairs," and the adaptive-protocol results) are **not reproducible from any single experiment and in places contradict the raw data**; the most load-bearing construct ("monitor accuracy") measures exact-secret *recovery* rather than *detection*; the defense is "validated" on a single confounded n=30 cell where the monitor is literally the sender model holding its own key; and there is **no related-work section at all** for an attack class with well-known public prior art. Several of these are fabrication-level discrepancies between text and data, not interpretive disagreements.

**Verdict: Reject (resubmit as Major revision).** The defensible scientific contributions — the cross-family survival comparison, the physical/cognitive taxonomy, and the same-family-monitoring observation — are worth salvaging, but the current draft overstates them with numbers that cannot be traced to experiments, draws deployment conclusions from underpowered null results, and reverses the careful disclosure posture of its own companion paper (GLOSSOPETRAE-I). The amount of re-measurement, re-framing, and prior-art work required exceeds a minor/major revision.

## 2. What the Paper Gets Right

Credit where it is due — these should be preserved through any revision:

- **The physical/cognitive taxonomy is a real insight.** The informed-monitor design cleanly distinguishes "the carrier never reached the model" from "the model couldn't decode what it saw," and the +0pp vs. +47–63pp contrast (Table 5) is a striking, defensible qualitative result.
- **The channel-table cells that were checked reproduce faithfully.** Per the data-integrity pass, Table 3, Table 5, the ensemble arithmetic, and the tokenizer-control rows all match the JSONs: tag_char_v2/GPT `chi2=28.03, p=1.19e-7`; pua_v2/Haiku `R=0.933, M=0, chi2=26.04`; semantic GPT/Gemini/Haiku `M=0.033/0.067/0.10`; informed monitor `M=0.50/0.633/0.733`; ensemble = 18.81%. The "chi-square invented?" concern does **not** apply to the channel tables.
- **The same-family-closure observation is worth reporting** (as an observation, not a validated defense). Per-trial, the informed Haiku monitor (22/30) tracks the receiver (21/30), diverging on only 3 seeds — a clean datum even though the interpretation is confounded (see §4).
- **The GPT-as-sender PUA control** (R=0%, GPT strips PUA on output too) is a thoughtful sanity check and is correctly reported.
- **Limitations 6.4 is candid** about model-version sensitivity, single-sender design, and payload size — the right instinct, just incomplete.

## 3. Blockers (must be fixed before this is publishable or shareable)

### B1. The "61-category survey" does not exist; it is two disjoint sweeps (41 + 20) summed.
*Locations:* Abstract, Contribution 1, §2.1, Table 1, §8, Appendix B.
No single 61-category, 5-family run exists. Ground truth: `tokenizer_survival_v2_5family.json` has 41 categories; `..._v3_5family.json` has 20; their category-key intersection is 0, so 61 = 41 + 20. Table 1's per-model totals are hand-sums across two runs with different panels and incompatible per-model behavior (GPT: 3 blind in v2 + 20 in v3 = 23; Haiku: 11 + 0 = 11). This is a fabricated denominator presented as one coherent survey.
**Fix:** Report v2 (41) and v3 (20) as two separate sweeps with separate tables, panels, and dates. Never sum disjoint category sets into a single per-model column.

### B2. "55 exploitable asymmetric pairs" is unsupported — the only complete 5-family run reports ZERO.
*Locations:* Abstract, Contribution 1, Table 2, §8.
`tokenizer_survival_v2_5family.json` (the one file containing all five families) has `asymmetric.length = 0`. The 55 is assembled from non-comparable sources over disjoint category sets, and **no single run nor any sum reproduces 55**. Compounding errors:
- Table 2's GPT↔Haiku = **14** contradicts the pairwise JSON (**13**); GPT↔Gemini = **3** contradicts the JSON (**2**). The §2.3 prose "14 independent channel categories" is wrong (should be 13). Since the row sum *is* the 55 headline, these +1 inflations are load-bearing.
- Four of seven rows (Llama↔Haiku=10, Mistral↔Haiku=10, Llama↔GPT=4, Mistral↔GPT=4) have **no pairwise source file at all** — Llama and Mistral never appear in any pairwise asymmetry file. Their only possible source is the v3 run, which is driven by a suspect GPT column (see B3).
- The abstract conflates "asymmetric categories" (what the array counts) with "sender–monitor pair combinations" (what the text claims).
**Fix:** State exactly which file/version backs each Table 2 row; define "exploitable" with an explicit gap threshold; fix GPT↔Haiku→13 and GPT↔Gemini→2 and re-sum; supply or delete the unsourced Llama/Mistral rows. If 55 cannot be reproduced from a fixed harness, remove it.

### B3. GPT-5-nano's v3 "20/20 blind" is almost certainly a harness artifact, and it drives the headline asymmetry.
*Locations:* Table 1 (GPT=23), §6.1 ("23-blind-spot gap"), Appendix B.
In v2, GPT is blind on 3/41 and perfect on 37/41. In v3 it is blind on **all 20/20**, including categories conceptually identical to ones it *preserved* in v2 (ZWSP, ZWJ, word-joiner, function-application, PUA-B). A model flipping from 37/41-perfect to 0/20 across a re-run is the classic signature of an API/parse/refusal failure scored as 0% survival, not 20 genuine tokenizer blind spots. The ground-truth notes themselves flag this as "a striking asymmetry not seen in V2." If it is an artifact, the honest GPT blind count is ~3 and the 5-family asymmetric-pair count is ~0 — which guts the thesis.
**Fix:** Inspect raw v3 GPT transcripts to confirm the model actually received and echoed input; add per-category n and raw-output logging that distinguishes a genuine 0% from a fetch failure. Do not report "23 blind / 55 pairs" until this column is validated.

### B4. The adaptive protocol (§4.4) reports results its own data file contradicts — including a fabricated trial.
*Locations:* §4.4.
Ground truth (`e3s_adaptive_channel_gpt-5-nano+claude-3.5-haiku.json`):
- **GPT cell:** 12 of 20 trials are `fetch failed`; only 8 ran. McNemar is computed on b=8,c=0 (Yates `(8−1)²/8 = 6.125 → p=0.0133`), i.e., **n_eff = 8, not 20**. Reporting "n=20" overstates the sample 2.5×.
- **Fingerprint claim is fabricated:** all 8 valid GPT trials returned `family=UNKNOWN, vector=null`. The sentence "In the one trial where GPT was correctly fingerprinted (vector [0,1,1])" describes a trial that **never occurred**.
- **Haiku arm is 100% errored:** all 20 trials `fetch failed`, fingerprint `{correct:0,total:0}`, rAcc=0, mAcc=0. The claimed "90% correct family identification" for Haiku has **no supporting data**.
**Fix:** Re-run with a working fetch path to a real n=20 of completed trials; report n_eff after dropping errors; delete the "[0,1,1]" sentence; delete or re-collect the entire Haiku 90% claim.

### B5. Construct validity: "monitor accuracy M" measures exact-secret RECOVERY, not DETECTION.
*Locations:* whole results section; Abstract; §1.1; Table 3/4/5 "M" columns; Appendix C.
Every M is `gradePayload(truth, monitorResponse).match`, true only if the monitor reproduces the exact `{color, number, shape}` tuple. That is cryptanalysis, not detection. A real safety monitor does not need to decode the adversary's private payload — it needs to *flag* that covert content is present. A monitor that correctly says "this contains hidden encoded data I can't read" scores M=0 here and is counted as fully evaded, even though it operationally defeated the attack. With ~11.8 bits of payload entropy, exact-tuple recovery is near-impossible *even when the channel is noticed*, so M is structurally pinned near 0 for reasons unrelated to detection. The entire "evasion" and "channel closed" framing inherits this error.
**Fix:** Add a binary "is hidden/covert content present? (yes/no)" detection metric scored against ground-truth presence, report detection precision/recall or AUC, and reframe "evasion" as "failed to flag." Keep exact-recovery only as a secondary information-leakage measure.

### B6. No related-work section and zero prior-art citations for a well-documented attack class.
*Locations:* whole paper; §1.2 is a single paragraph citing only GLOSSOPETRAE-I; 0 bibliography entries.
Unicode tag-character smuggling, PUA/invisible-character injection, and homoglyph/format-control evasion against LLMs are public prior art (e.g., Goodside / Embrace The Red 2024 ASCII-smuggling demos; Boucher et al., "Bad Characters," IEEE S&P 2022; Unicode UTR#36/#39; the security-motivated deprecation of tag characters in Unicode 5.1). Presenting tag-char and PUA channels as novel with no engagement materially overstates contribution and is disqualifying at a top-tier security venue. A reader cannot separate what is new (the cross-family survival landscape, the physical/cognitive taxonomy) from what is decades-old (the smuggling primitives).
**Fix:** Add a proper Related Work section; cite the imperceptible-attack/smuggling literature; reframe the *primitives* as prior art and narrow novelty to the cross-family comparison, the informed-monitor physical/cognitive separation, and the same-family-monitoring result.

### B7. §7 states disclosure and a blanket data release as completed facts; both are unsafe and reverse the GLOSSOPETRAE-I posture.
*Locations:* §7, Abstract.
"We share results with affected model providers" and "all experiments, harnesses, and result data are released" are written as accomplished facts. There is no evidence disclosure occurred; the result set contains MOCK files and the suspect v3 GPT column, so a blanket release would publish mock/unvalidated artifacts as clean. More seriously, GLOSSOPETRAE-I explicitly does **not** release the covert-relay protocol or evasion ladder and keeps that wiring out of public methods — III silently reverses this by publishing operational tag/PUA encoders and the full PROBE/IDENTIFY/SELECT/EXPLOIT recipe (§3.3).
**Fix:** State disclosure status truthfully ("we intend to coordinate disclosure" if not yet done); enumerate exactly which code/data are released and exclude MOCK and unvalidated runs; deliberately decide — and justify against the I posture — whether the operational channel constructions and adaptive exploit recipe should be public at all.

## 4. Major Issues

### M1. The same-family "channel closed" defense is built on one confounded, underpowered cell.
*Locations:* Abstract, Contribution 4, §4.3, §5.2–5.3, Table 5 row Semantic→Haiku.
The "Defended" verdict rests entirely on one condition: Haiku-sender / Haiku-monitor / informed, n=30, gap=−0.033, McNemar `chi2=0, p=1.0`.
- **p=1.0 is failure to reject H0, not evidence the gap is zero.** At n=30 with M=0.733 the test is badly underpowered: Monte-Carlo McNemar power is ~0.21 to detect a true 15pp gap, ~0.27–0.31 at 20pp, ~0.56–0.61 at 30pp; the minimum detectable effect (best-case c=0, 6/30 discordant) is ~20pp. A residual 15–20pp leak routinely yields p=1.0 here. The data are consistent with the channel still substantially open.
- **The "same-family" attribution is confounded three ways:** the monitor is literally the same model that authored the encoding, given that model's *exact* key. Per-trial, the informed monitor diverges from the receiver on only 3/30 seeds — it is functionally a second copy of the receiver. "Same architecture" is inseparable from "is the author" and "has the key." Cross-family informed monitors do *not* close the gap (Gemini gap=0.267 p=0.043; GPT gap=0.30 p=0.027 — still significant leakage).
**Fix:** Downgrade "validated"/"Defended"/"near-universal coverage" to "preliminary single-condition evidence." Either run a TOST equivalence test with a pre-specified margin or raise n (~150–200 for 80% power at 15pp). Add controls disentangling architecture-similarity from authorship and key-possession (same family different snapshot/size as monitor; cross-family monitor given an oracle key). Reword every "same-family" claim to "self-monitoring (identical model, own key)" and drop the §6.2 architectural recommendation that rests on this one cell.

### M2. The uninformed gap is confounded with a prompt asymmetry, so "any detection failure is purely cognitive" (§3.2) is unsupported.
For the uninformed rows the receiver is told the exact method, location ("appended after the visible paragraph"), and output schema, while the uninformed monitor gets only generic "this may contain hidden information." The receiver>monitor gap therefore mixes capability/access with task specification. The informed cells (where the monitor is finally told the method) are the only fair comparison — and M indeed jumps to 50–73%, partly *because* the monitor was finally instructed.
**Fix:** Hold task specification constant across receiver and uninformed monitor, or explicitly separate the instruction effect from the capability effect. Rest covertness claims on the matched-instruction comparison and reword "purely cognitive."

### M3. The capacity claim is fabricated and contradicts the data.
*Locations:* §4.5.
The real experiment (`e3s_tag_capacity_anthropic-claude-3.5-haiku.json`) tests sizes **20, 50, 100, 200, 500, 1000, 2000 B at reps=2** — neither 16B nor 128B is a tested size. avgCharAcc: 20B=0.475, 50B=0.05, 100B=0.035, 200B=0.0175, 500B=0.005, **1000B=0.008 > 500B=0.005** (non-monotonic), 2000B=0.00275. This is a per-character metric that collapses to noise by 50B, not "successful transmission to 128 bytes," and the values sit near the MOCK file's ~0.03 floor (risking that a wrong/smoothed file was described). There is no binary-recovery metric to support "successfully transmit."
**Fix:** Report the actual sizes (20–2000B) and reps (2); state usable recovery exists only at ~20B (and only ~47.5%); delete "16 to 128 bytes," "monotonically decreasing," and "successfully transmit"; confirm the real (not MOCK) file was used; add a binary-recovery metric and more reps before any capacity claim.

### M4. No negative control / false-positive baseline — M is uninterpretable as a detector.
The monitor is explicitly instructed to "still try to guess" even when it finds nothing, so it can never output "no covert content" and has no measurable false-positive rate. No clean/no-payload trial is ever fed to any monitor, so P(alarm | no payload) is unknown. Without it, P(recover | payload) cannot be turned into precision or an ROC point — yet the paper draws deployment conclusions. The sibling `rigor_sweep.mjs` already implements base-rate guessers and negative controls; the III stego suite has none.
**Fix:** Add clean-message negative controls for every monitor/channel cell; allow the monitor to abstain (`NO_HIDDEN_CONTENT`); report a confusion matrix / precision-recall; recompute the defense table from a real operating point.

### M5. Underpowered headline contributions don't survive multiple-comparisons correction.
*Locations:* §4.3, §4.4, Appendix A.
~21 statistical tests are run with no Bonferroni/FDR mention. The strong tokenizer/uninformed-semantic claims (p~1e-6 to 1e-7) survive easily. The *mechanistically load-bearing* borderline results do not: at Bonferroni α=0.0024 (m=21), informed Gemini (p=0.0433), informed GPT (p=0.0265), pua Gemini→GPT n=10 (p=0.0233), semantic_tagkey n=10 (p=0.0133), and the adaptive protocol (p=0.0133) all fail. The +56pp/+47pp informed cross-family improvements anchoring the cognitive-vulnerability taxonomy rest on uncorrected p=0.043/0.027.
**Fix:** State the number of tests, apply Bonferroni or Benjamini-Hochberg, and re-label which results survive. Back the cross-family informed and adaptive/small-n claims with larger n or report them as not surviving correction.

### M6. Single-sender, single-schema, single-cover-text-universe — external validity is far narrower than stated.
Every semantic data point uses Claude 3.5 Haiku as the sole sender, one payload schema (~11.8 bits, not 9.8 — see m4), drawn from only 10 hard-coded cover topics (3 trials/topic at n=30); the capacity experiment reuses a single fixed paragraph for all sizes. Cover content is a first-order driver of both encodability and detectability and is held nearly constant. Limitations 6.4 lists model/sender/payload limits but omits the cover-text monoculture entirely.
**Fix:** Add ≥2 sender families, ≥2 payload schemas, and a diverse cover-text corpus as an explicit factor with variance reported; add a cover-text bullet to Limitations; scope "near-universal coverage" to the tested cover distribution.

### M7. "Validated defense" / "near-universal coverage" overclaims throughout.
Aggregating M1, M4, and B5: Layer 2 is one confounded cell, the metric measures the wrong thing, and there is no false-positive baseline. Calling the architecture "validated" and semantic stego "Defended" (Table 5.3) generalizes far beyond the evidence.
**Fix:** Demote to "preliminary"; scope claims to the single tested cell; remove "near-universal coverage."

## 5. Minor Issues & Nits

- **m1 — Tables 3/5 mix n=10 and n=30 silently.** §4.1's blanket "all primary experiments use n=30" is false. The informed-tokenizer cells are n=10 (`tag_char_v2_informed` Haiku→GPT and `pua_v2_informed` Gemini→Haiku both n=10, p=0.00442665 = McNemar b=8,c=0 at n=10); all §4.5 controls are n=10. **Fix:** add an explicit n column to Tables 3–5; scope the n=30 claim to the experiments it covers.
- **m2 — §4.3 "p=0.004 for both" misattributes the n=10 value to the n=30 flagship.** Table 3's uninformed flagships are p~1e-7 (n=30); 0.004 belongs only to the n=10 informed runs. "For both" is internally inconsistent with Table 3. **Fix:** cite the correct per-experiment p-values and sample sizes, or re-run informed tokenizer at n=30.
- **m3 — "3-model ensemble ~19%" assumes monitor independence, which is unjustified.** The three monitors grade the same 30 payloads, so detection events are positively correlated and the true union is *lower* than the 18.8% independence product. Presented as a table row with only an asterisk. **Fix:** compute the actual union from per-message grading (data exists), or label 19% an upper bound under an explicit, likely-violated assumption.
- **m4 — Payload entropy and chance baseline are wrong.** 6 colors × 100 numbers × 6 shapes = 3600 → log2 = **11.81 bits**; chance = 1/3600 = **0.028%**. Paper says "~9.8 bits" / "~0.1%" (Appendix A, §3.2); `lib/payloads.mjs` itself computes `log2(6*100*6)`. (Note Appendix A lists 7 shapes in prose but the code uses 6 — reconcile.) **Fix:** correct to ~11.8 bits / ~0.03%.
- **m5 — Survival-rate harness has a counting bug producing rates > 1.0.** `musical-symbols` = 5 survived / 3 expected = **1.667** uniformly for all five models; `math-double-struck` Mistral = 6/5 = 1.2. A fraction-preserved metric cannot exceed 1.0, so the codepoint matcher is wrong for at least these categories and may distort borderline (NFD, variation-selector, combining-mark) classifications that feed Table 1/2. **Fix:** cap/correct the matcher (survived ≤ expected), re-derive Tables 1–2 and Appendix B, audit every non-{0,1} rate.
- **m6 — Gemini variation-selector weakness "33–100%" is a single 33.3% point.** v3 base-variation-sel Gemini rate = 0.3333; no 100% upper bound exists in the data (§2.3, Appendix B). **Fix:** report 33%, or release the per-codepoint data justifying a range.
- **m7 — PUA R=93% explanation is contradicted by the data.** Both failing trials (seeds 6000, 6189) have color=1, shape=1, only number=0, on two-digit numbers (93, 72) — a numeric decode/parse bug, not "Gemini failing to emit PUA characters." **Fix:** investigate the digit-mapping bug; remove the unsupported speculation.
- **m8 — "Physical absence" of the carrier is asserted, not measured.** Informed-tokenizer trials log only all-zero `monitorFields`; no record of the bytes the monitor received or its raw response. An all-zero result is equally consistent with stripping and with a broken/ignored decode instruction, especially since the experiment runs only against families the paper already claims strip those ranges. **Fix:** log the exact codepoints sent and the verbatim monitor response; add a visible-ASCII echo control and a known-permissive-monitor (Gemini) positive control showing M>0% when chars survive.
- **m9 — A trivial non-model baseline defeats the physical channels entirely.** Tag/PUA carriers are ASCII shifted into fixed codepoint blocks; a two-line regex/codepoint-presence filter (the paper's own `STEGO.*.decode` functions) detects and decodes 100% with no LLM. This makes "physical blind spot" only a property of pipelines lacking byte-level sanitization and relocates the genuine novelty to the survival landscape + semantic taxonomy. Only the semantic channel survives a non-model filter. **Fix:** add the deterministic detector as an explicit baseline; state physical channels are exploitable only against pipelines without input sanitization.
- **m10 — No figures.** The paper has zero figures; the core taxonomy result (flat vs. +47–63pp) and a gap-vs-monitor-capability plot are exactly what a figure would make legible. **Fix:** add at least the uninformed-vs-informed 2×2 and a gap-vs-capability plot.
- **m11 — Model identifiers are unpinned OpenRouter aliases.** "June 2026 versions" is not a snapshot pin; no provider/snapshot/fingerprint metadata is stored, directly undercutting the reproducibility claim for the version-dependent survival landscape. **Fix:** record resolved provider/snapshot per model and archive raw API metadata.
- **m12 — Taxonomy over-asserted as proven.** "proving … fundamentally distinct," "hardware-level blind spot," "physically incapable" (Abstract, §1, §4.3): tokenizer normalization is software preprocessing, not hardware, and one informed experiment supports rather than proves two distinct classes. **Fix:** soften to "we propose … supported by"; replace "hardware-level" with "preprocessing-level."
- **m13 — Headline tokenizer numbers are sender-specific.** Tag R=100% uses a Haiku sender; PUA R=93% uses a Gemini sender; GPT can send neither (R=0%). "Perfect evasion" is true only for the haiku→GPT tag-char cell. **Fix:** name the sender per channel in Abstract/Table 3 and qualify "perfect evasion."

## 6. Prioritized Fix List

Work top-down; the first block is non-negotiable for any resubmission.

1. **Fix or remove the three fabricated/contradicted headline numbers.** (a) Re-run the adaptive protocol to real completed n=20; report n_eff=8 meanwhile; delete the "[0,1,1]" trial and the Haiku 90% claim (B4). (b) Validate the v3 GPT 20/20 column against raw transcripts; if artifact, drop it (B3). (c) Recompute pairwise asymmetric counts from a fixed multi-model harness (the v2 5-family detector compares only models[0] vs [1]); reconcile or remove "55" and fix GPT↔Haiku→13, GPT↔Gemini→2 (B2).
2. **Stop presenting two sweeps as one.** Split v2 (41) and v3 (20) into separate tables with separate panels/dates; never sum disjoint category sets (B1).
3. **Re-instrument the monitor metric.** Add a yes/no detection metric scored against payload presence + clean-message negative controls + abstention; report precision/recall; reframe "evasion" and rebuild the defense table from an operating point (B5, M4).
4. **Add a Related Work section** and cite the imperceptible-attack / Unicode-smuggling literature; narrow novelty claims accordingly (B6).
5. **Rewrite §7 disclosure truthfully**, enumerate exactly what is released, exclude MOCK and unvalidated runs, and reconcile the operational-recipe release with the GLOSSOPETRAE-I posture (B7).
6. **Demote the defense to preliminary.** Run TOST equivalence or raise n (~150–200) before any "channel closed" claim; add controls separating architecture-similarity from authorship/key; reword "same-family" → "self-monitoring (own key)"; remove "validated"/"near-universal coverage"/"Defended" (M1, M7).
7. **Separate the instruction confound** from the capability effect; rest covertness claims on matched-instruction comparisons; reword "purely cognitive" (M2).
8. **Apply multiple-comparisons correction**, state the test count, and re-label which results survive (M5).
9. **Correct the capacity section** to actual sizes/reps/curve; remove "16–128 bytes," "monotonic," "successfully transmit"; confirm real (not MOCK) file (M3).
10. **Broaden external validity:** ≥2 senders, ≥2 schemas, diverse cover-text corpus; add cover-text to Limitations (M6).
11. **Fix the survival-rate counting bug** (rates >1.0) and re-derive Tables 1–2 / Appendix B (m5).
12. **Add per-row n columns** to Tables 3–5; scope the "all n=30" claim (m1, m2).
13. **Correct entropy/chance** to ~11.8 bits / ~0.03% and reconcile the 6-vs-7-shape discrepancy (m4).
14. **Add a deterministic codepoint-filter baseline**; relocate novelty to the landscape + taxonomy (m9).
15. **Pin model snapshots**, add figures, add carrier-byte/response logging for the "physical absence" claim, fix the PUA-failure explanation, the Gemini "33–100%" range, the ensemble independence caveat, and soften "hardware/proving" language (m3, m6, m7, m8, m10, m11, m12, m13).
