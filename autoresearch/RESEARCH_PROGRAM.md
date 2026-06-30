# Research Program: Language-Based Memory Compression

## Thesis

A useful agent memory compressor should do more than shorten text. It should preserve the information that future agents need, expose why each retained fact exists, and stay measurable under downstream tasks. GLOSSOPETRAE contributes a rare substrate: generated languages, token-aware rewriting, formal-language benchmarks, and adversarial validation habits.

The research bet is that a controlled language/DSL/codebook layer can compress agent memory while improving retrieval precision and auditability, provided it is evaluated against strict task-quality gates rather than flattering token-ratio metrics.

## Design principles

1. Evaluate end-to-end memory pipelines, not compression functions in isolation.
2. Prefer exact-token and downstream-task measurements over heuristic wins.
3. Preserve source pointers and evidence; every compressed fact must be auditable.
4. Keep canonical memory human-readable; derived compressed/indexed forms are rebuildable.
5. Treat generated/covert-language machinery as a stress-test and formal substrate, not as a hidden-channel deployment target.
6. Use fresh autoresearch sessions with state injected from files, never from chat history.

## Candidate compression forms

| Form | Description | Risk | Evaluation gate |
|---|---|---|---|
| Extractive fact cards | Typed facts with entity/source/time metadata | Loses narrative nuance | Recall precision/recall + source fidelity |
| Telegraphic controlled English | Abbreviated but human-reviewable memory notes | Ambiguity | Reconstruction + downstream answer quality |
| Domain DSL | Compact grammar for tasks, decisions, entities, constraints | Tooling overhead | Parser round-trip + human editability |
| GLOSSOPETRAE codebook | Generated symbols map to recurring task/memory concepts | Opaque if unmanaged | Codebook audit + exact token counts |
| Hybrid retrieval+compression | Store full source, inject compressed bundle | Retrieval misses | End-to-end task success vs baseline |

## Metrics

- Compression ratio: original tokens / injected tokens, using exact tokenizer when available.
- Retention: important fact recall@k and entity coverage.
- Reconstruction: ability to regenerate source-relevant detail from compressed form plus citations.
- Downstream success: agent task completion on held-out tasks with baseline vs compressed memory.
- Latency/cost: retrieval + compression + prompt assembly time and API spend.
- Auditability: percent of injected claims with source path/line or URL.
- Safety/privacy: redaction success, secret leakage zero-tolerance tests, dual-use boundary compliance.

## Baselines

1. No compression, full source injection within budget.
2. Rolling summary only.
3. Extractive top-k retrieval with FTS5.
4. Hybrid FTS/vector retrieval.
5. LLMLingua/Selective Context style prompt token selection.
6. Provider context caching without semantic compression.
7. GLOSSOPETRAE/TokenCompressor-derived controlled-language compression.

## Near-term experiments

- E0: exact tokenizer smoke test for GPT-like, Claude-like, SentencePiece-like profiles.
- E1: compress/reconstruct a curated set of prior Hermes task transcripts.
- E2: memory recall benchmark over local wiki facts with source citations.
- E3: downstream coding-agent benchmark: answer/refactor tasks with full vs compressed context.
- E4: conflict-resolution benchmark: stale vs newer facts, confidence/evidence updates.
- E5: privacy benchmark: redaction before memory/provider/plugin egress.

## Output target

The final artifact should be an implementation-ready design for a Hermes memory-compression plugin/MCP tool, plus a benchmark report showing when language-based compression beats simpler baselines and when it does not.
