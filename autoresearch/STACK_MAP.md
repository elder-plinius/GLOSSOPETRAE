# Autoresearch Stack Map

Initialized: `2026-06-30T09:57:04.801684Z`
Worktree: `/Users/filipdam/projects/parseltongue/GLOSSOPETRAE-worktrees/main-continue-20260630-084226`

## Executive map

The stack already has the pieces needed for a serious autoresearch loop. The missing part was a durable task structure that makes those pieces work together without relying on chat history.

| Layer | Use in this program | Present evidence | Gap / next action |
|---|---|---|---|
| Deli_AutoResearch | Long-horizon orchestration, state files, stall detection, cron prompts | Loaded skill + templates; this directory follows its state layout | Create durable cron jobs and keep prompts self-contained |
| Looper | Loop design, verification gates, run handoff patterns | `looper` skill imported globally in prior session | Use for future specialized subloops, not as the main durable state store |
| Hermes core | Agent runtime, cron, delegate_task, file/terminal/web/browser/session tools | Active coder profile and Hermes skill docs | Keep cron prompts independent of this conversation |
| Project substrate | GLOSSOPETRAE TokenCompressor, generated languages, benchmark and validation harnesses | `src/modules/TokenCompressor.js`, `bench/README.md`, `validation/THESIS.md` | Add exact-tokenizer and memory-quality evals before claiming compression wins |
| Memory providers | Persisted facts, graph memory, semantic recall, retention/reflection | Local plugin manifests: Honcho, Hindsight, Mem0, OpenViking, Holographic, ByteRover, Supermemory, RetainDB | Pick one local-first baseline and one cloud/semantic baseline for comparison |
| Research connectors | Literature and repo discovery | Skills/plugins: arxiv, duckduckgo-search, llm-wiki, qmd, GitHub, web/browser plugins | Preserve structured source captures in `sources/` and findings JSONL |
| MCP/connectors | App integration and future tool surface | `native-mcp` skill/docs in previous inventory; Hermes MCP commands available | Define a memory-compression MCP contract after prototype metrics stabilize |
| Evaluation | Compression ratio, retention, reconstruction, downstream-task quality | Existing GLOSSOPETRAE bench proves execution-graded generated tasks | Build a new memory/context benchmark with golden traces and exact-token counts |

## Relevant local/project components

- `src/modules/TokenCompressor.js`: rough BPE profile estimator plus code/prose optimizers.
- `bench/README.md`: seed-generated benchmark design, execution grading, real-model runner shape.
- `validation/THESIS.md`: strong cautionary evidence about flattering metrics, grader caps, and the need for strict scoring.
- `PAPER.md` and experiment harnesses: tokenizer asymmetry and echo-fidelity lessons that should transfer to compression evaluation.

## Hermes skills and tools to keep in the loop

| Capability | Primary skill/tool | Why it matters |
|---|---|---|
| Durable autoresearch | `Deli_AutoResearch`, `cronjob` | Fresh-session iterations, heartbeat, stall pivots |
| Loop/gate scaffolding | `looper` | Design subloops with typed verification and guardrails |
| Hermes operations | `hermes-agent` | Correct commands for profiles, cron, MCP, plugins, gateway |
| Local knowledge search | `qmd`, `llm-wiki`, `session_search` | Mine local notes, past sessions, and project knowledge without re-reading everything |
| Literature discovery | `arxiv`, `duckduckgo-search`, web/browser tools | Track compression/memory research updates |
| Repo discovery | GitHub skills/CLI, codebase-inspection | Mine stars/repos for implementation patterns |
| Memory experiments | Honcho, Hindsight, Mem0, OpenViking, Holographic, ByteRover, Supermemory, RetainDB plugins | Compare memory substrates and retrieval/compression behaviors |
| App integration | `native-mcp`, webhooks, AgentMail if needed | Expose compression/recall as a tool surface |
| Verification | terminal/file tools, project tests, validator script | Every tick must leave verifiable artifacts |

## Memory provider inventory from local plugin manifests

| Plugin | Manifest description | Suggested role |
|---|---|---|
| honcho | Cross-session user modeling with dialectic Q&A, semantic search, persistent conclusions | User/profile memory baseline |
| hindsight | Knowledge graph, entity resolution, multi-strategy retrieval | Graph/reflect baseline |
| mem0 | Server-side fact extraction, semantic search, reranking, deduplication | Cloud/semantic baseline |
| openviking | Context database, automatic extraction, tiered retrieval, filesystem-style browsing | Context DB candidate |
| holographic | Local SQLite fact store with FTS5, trust scoring, HRR retrieval | Local-first experimental baseline |
| byterover | Persistent knowledge tree with tiered retrieval via `brv` CLI | Tree-memory baseline, especially for pre-compress hooks |
| supermemory | Semantic long-term memory with explicit tools and session ingest | Semantic memory baseline |
| retaindb | Cloud memory API with hybrid search and seven memory types | External API comparison; needs API key |

## External source tracks recovered from last session

The previous session captured search results for Anthropic context engineering, OpenAI Agents SDK memory evals, LLMLingua/LongLLMLingua, Selective Context, Letta/MemGPT, Mem0, and Zep/Graphiti. Sanitized copies are in `sources/external-memory-compression-sources.json`.

Use them as discovery seeds, not as verified citations. Future ticks must verify claims against primary docs/papers before publishing final conclusions.

## Gaps that block serious claims

1. Exact tokenizer measurement. `TokenCompressor` uses useful rough profiles, but publishable compression work needs exact tokenizer backends or verified provider token counts.
2. Downstream quality metrics. Compression ratio alone is not enough; require answer quality, reconstruction fidelity, fact retention, and task-success deltas.
3. Memory corpus. Need a representative trace corpus: chats, code tasks, research notes, and synthetic adversarial memory conflicts.
4. Baselines. Compare against rolling summaries, extractive summaries, vector retrieval, FTS retrieval, LLMLingua-style token selection, and provider context caching.
5. Privacy and audit. Compression should emit inspectable, redacted artifacts with source pointers; no opaque memory mutation without evidence links.
6. Fleet inventory. Tailnet host inventory was attempted in the prior session but preserved poorly; rerun with structured redacted output before claiming fleet-wide coverage.
7. Safety boundary. Keep GLOSSOPETRAE covert-channel features in evaluator/stress-test mode only.

## Rollout order

1. M0: harden stack inventory and preserve redacted tool/plugin/provider facts.
2. M1: define benchmark corpus, metrics, and baselines.
3. M2: integrate exact token measurement.
4. M3: design compression languages/DSLs/codebooks.
5. M4: wire memory-provider baselines.
6. M5: build prototype API + benchmark runner.
7. M6: run controlled evaluations on benign traces.
8. M7: add MCP/tool surface.
9. M8: harden privacy/audit/security.
10. M9: synthesize publishable report and product plan.
