# M1 — Memory-Compression Benchmark Design

Generated: 2026-06-30T10:16:24Z  
Milestone: M1  
Scope: benchmark design only; exact tokenizer wiring is deferred to M2.

## 1. Benchmark thesis

GLOSSOPETRAE should evaluate memory/context compression as an **end-to-end agent utility problem**, not just as a string-shortening task. A compressed memory is successful only if it:

1. uses fewer provider tokens,
2. preserves enough semantics to reconstruct or use the original state,
3. improves or preserves downstream task success after rehydration, and
4. does not leak secrets, hidden prompts, or dual-use operational payloads.

This matches the local benchmark pattern already present in `bench/`: seed-generated tasks, deterministic oracles, execution/round-trip grading, and machine-readable scorecards.

## 2. Primary local evidence

- `bench/README.md:14-25` states that benchmark items are generated at eval time, use GLOSSOPETRAE engines as oracles, and support tunable difficulty.
- `bench/glossopetrae-bench.mjs:107-121` defines task generators with oracle solutions hidden from real model calls; `bench/glossopetrae-bench.mjs:326-355` aggregates scores and exposes confidence interval concerns.
- `src/modules/TokenCompressor.js:10-14` frames compression as minimizing token count while preserving semantic fidelity; `src/modules/TokenCompressor.js:22-24` confirms current tokenizer profiles are rough models.
- `src/modules/TokenCompressor.js:355-403` already has exact code fidelity via interpreter stdout for CodeForge programs.
- `src/modules/TokenCompressor.js:478-519` already has a prose optimization loop with content-word fidelity.

## 3. External source capture used

Live source capture file: `autoresearch/sources/M1-live-source-captures-20260630T101624Z.json`

Relevant verified source notes:

- LLMLingua README fetched with HTTP 200 and identifies the LLMLingua / LongLLMLingua / LLMLingua-2 prompt-compression family as a relevant baseline family.
- ACL Anthology page for “Compressing Context to Enhance Inference Efficiency of Large Language Models” fetched with HTTP 200 and describes Selective Context as pruning redundancy to make input context compact.
- Anthropic context-engineering page fetched with HTTP 200 and describes context as a finite resource / token set whose utility must be optimized.
- OpenAI evaluation-best-practices page fetched with HTTP 200; it should be used later for eval hygiene, graders, and optimization-cycle checks.

## 4. Corpus design

The benchmark should use five corpus strata so that compression success is not overfit to one context shape.

| Stratum | Input generator | Why it matters | Oracle / scoring source |
|---|---|---|---|
| S1 Synthetic task state | Generated Deli-style `task_spec`, `progress`, `findings`, and logs with seeded facts | Tests preservation of structured autonomous-agent state | Exact JSON facts + downstream QA |
| S2 GLOSSOPETRAE code/program context | Generated CodeForge specs and programs | Tests exact semantic preservation for executable context | CodeForge interpreter stdout |
| S3 Conlang / DSL context | Generated Glossopetrae language specs, lexicons, examples, compressed codebooks | Tests language acquisition after lossy context reduction | Translation / reverse-translation round trip |
| S4 Repo/documentation context | Redacted local docs and benchmark descriptions | Tests practical engineering-memory summarization | File-local fact probes + task completion |
| S5 Agent conversation memory | Synthetic or redacted multi-turn agent traces with decisions, blockers, and user preferences | Tests long-horizon memory compression | Hidden fact probes + next-action prediction |

Corpus construction rules:

1. All generated items must be seeded and reproducible.
2. All real local material must pass a redaction pass before inclusion.
3. No `.env`, key files, tokens, credential stores, or private user payloads are benchmark inputs.
4. Each item should include an uncompressed source, a gold fact table, and at least one downstream task prompt.
5. The benchmark should report per-stratum scores, not only a global mean.

## 5. Candidate benchmark tasks

### T1 — Fact recall after compression

- Input: structured task state plus noisy logs.
- Compressor output: compact memory string or GLOSSOPETRAE DSL state.
- Rehydration prompt: ask the model to answer hidden factual questions.
- Score: exact match / normalized F1 over held-out facts.

### T2 — Next-action reconstruction

- Input: Deli-style iteration history with stale directions and milestone state.
- Task: choose the correct next milestone action after reading only compressed memory.
- Score: rubric match against the oracle next-action label.

### T3 — Code semantic preservation

- Input: CodeForge spec + program + task notes.
- Compressor output: compressed representation.
- Task: rehydrate enough context to predict or repair program behavior.
- Score: interpreter execution / ordered output match.

### T4 — Conlang / DSL preservation

- Input: generated GLOSSOPETRAE language spec plus examples.
- Compressor output: codebook or language-like compressed memory.
- Task: translate or generate held-out sentences after rehydration.
- Score: translation round-trip F1 using existing GLOSSOPETRAE engines.

### T5 — Decision-log preservation

- Input: agent logs with explicit `level=decision` entries mixed with noise.
- Task: recover key decisions, reasons, and forbidden repeats.
- Score: exact decision IDs + semantic rationale match.

### T6 — Safety-preserving compression

- Input: benign docs containing planted fake secrets, private-looking strings, and non-actionable security text.
- Task: compress while redacting sensitive patterns and preserving safe operational facts.
- Score: redaction recall, false-positive rate, and downstream utility.

## 6. Metrics

### Token and cost metrics

- `input_tokens_exact`: exact provider/tokenizer count for the uncompressed input.
- `compressed_tokens_exact`: exact provider/tokenizer count for compressed output.
- `rehydrated_tokens_exact`: exact tokens after decompression/rehydration prompt.
- `compression_ratio`: `compressed_tokens_exact / input_tokens_exact`.
- `end_to_end_ratio`: `(compressed_tokens_exact + rehydrated_tokens_exact) / input_tokens_exact`.
- `provider_cost_estimate`: optional cost projection once provider pricing is supplied.

M2 must replace the current rough `TokenCompressor.estimateTokens()` counts with exact tokenizer APIs where possible.

### Fidelity metrics

- `fact_recall`: proportion of gold facts recovered.
- `fact_precision`: recovered facts that are actually supported by source.
- `semantic_f1`: normalized content-word or embedding-assisted F1 for prose only.
- `execution_equivalence`: binary / graded exactness for executable contexts.
- `decision_equivalence`: decision label + rationale preservation.

### Utility metrics

- `downstream_task_score`: success on the hidden task after compressed memory injection.
- `delta_vs_raw`: compressed score minus raw-context score.
- `delta_vs_summary`: compressed score minus vanilla-summary baseline.
- `latency_ms`: compressor + rehydration overhead.
- `failure_class`: categorized failure mode for analysis.

### Safety metrics

- `secret_recall`: fraction of planted sensitive strings removed.
- `secret_false_positive_rate`: benign facts incorrectly removed.
- `policy_boundary_preserved`: whether no forbidden operational payload is made more actionable.
- `auditability_score`: whether a reviewer can trace compressed fields back to source facts.

## 7. Baselines

| Baseline | Description | Expected role |
|---|---|---|
| Raw context | No compression | Upper-bound utility; worst token cost |
| Truncate-head | First N tokens only | Naive lower-effort baseline |
| Truncate-tail | Last N tokens only | Strong for recent-agent-state tasks |
| Vanilla summary | LLM-generated summary under same token budget | Human-readable compression baseline |
| Extractive salient sentences | BM25/keyword or simple sentence selection | Transparent non-generative baseline |
| TokenCompressor rough profiles | Existing `TokenCompressor` estimator and hill climber | Local baseline before exact tokenization |
| GLOSSOPETRAE DSL/codebook | Explicit compressed language / codebook memory | Candidate research approach |
| LLMLingua family | External prompt-compression baseline family | Compare against established learned/pruning methods |
| Selective Context | External redundancy-pruning baseline | Compare against lexical-unit pruning |
| Memory-provider retrieval | Store facts externally and inject only retrieved subset | Tests whether retrieval beats compression |

## 8. Evaluation protocol

1. Generate a seeded corpus shard: `N` items per stratum.
2. For each item, run every baseline at token budgets such as 10%, 20%, 40%, and 60% of raw context.
3. Count tokens exactly for both input and compressed outputs.
4. Run downstream tasks with identical model/provider settings.
5. Grade using deterministic oracles where available; otherwise use constrained rubric graders with saved grader prompts and outputs.
6. Emit JSONL item results plus an aggregate markdown report.
7. Analyze confidence intervals before publishing model/baseline rankings.

Minimum pilot: 5 seeds × 5 strata × 4 budgets × baseline subset.  
Publishable run: enough seeds to make confidence intervals narrower than the expected baseline deltas.

## 9. Failure-mode taxonomy

| Code | Failure mode | Example symptom | Mitigation |
|---|---|---|---|
| FM1 | Entity loss | User/project/milestone names disappear | Mandatory entity table |
| FM2 | Direction drift | Rehydrated state suggests a tried direction | Preserve `directions_tried` explicitly |
| FM3 | Number corruption | Counts, dates, or token budgets change | Numeric checksum/fact table |
| FM4 | Causal inversion | Decision reason reversed | Decision graph / `because` edges |
| FM5 | Executable breakage | Code no longer runs or outputs differ | Interpreter oracle gate |
| FM6 | Over-redaction | Safe operational facts removed | Redaction precision metric |
| FM7 | Under-redaction | Planted secret survives compression | Redaction recall metric |
| FM8 | Compression-only win | Tokens lower but task score collapses | Require downstream utility gate |
| FM9 | Provider-token mismatch | Local estimate diverges from provider billing | Exact tokenizer/provider count checks |
| FM10 | Audit failure | Cannot trace compressed token to source fact | Source-span metadata requirement |

## 10. Scorecard shape

Each benchmark run should write a machine-readable result like:

```json
{
  "run_id": "membench-YYYYMMDD-HHMMSS",
  "model": "provider/model",
  "tokenizer": "exact-tokenizer-name",
  "seeds": [1, 2, 3],
  "baselines": {
    "raw": {"utility": 0.94, "tokens": 12000},
    "glossopetrae_dsl_20pct": {"utility": 0.88, "tokens": 2400, "secret_recall": 1.0}
  },
  "by_stratum": {},
  "failure_modes": {},
  "confidence_interval": {}
}
```

## 11. Acceptance gates for M6 implementation

The later controlled evaluation milestone should not be considered complete unless:

1. exact token counts are available for at least one target tokenizer/provider,
2. raw, vanilla summary, TokenCompressor, and GLOSSOPETRAE DSL/codebook baselines all run,
3. at least one executable-context task is graded by interpreter output,
4. at least one memory-state task is graded by hidden facts / next action,
5. redaction metrics are reported with planted synthetic secrets, and
6. the report includes confidence intervals or an explicit small-sample warning.

## 12. Immediate implementation targets

- `autoresearch/bench/memory-corpus.mjs`: seeded corpus builders for S1-S5.
- `autoresearch/bench/compressors/*.mjs`: baseline compressor adapters.
- `autoresearch/bench/token-counts.mjs`: exact tokenizer abstraction from M2.
- `autoresearch/bench/grade-memory.mjs`: fact, execution, and decision graders.
- `autoresearch/bench/run-memory-bench.mjs`: runner emitting JSONL item results.
- `autoresearch/bench/analyze-memory-bench.mjs`: aggregate tables, CI, failure modes.

## 13. Decision

M1 should be treated as complete: it specifies corpus strata, tasks, metrics, baselines, failure modes, and implementation targets. M2 should now focus on exact tokenizer integration so that this benchmark can stop relying on rough BPE estimates.
