# Task Spec: GLOSSOPETRAE Autoresearch Gigathing

Task name: `glossopetrae-autoresearch-gigathing`
Framework: `Deli_AutoResearch`
Initialized: `2026-06-30T09:57:04.801684Z`
Working directory: `/Users/filipdam/projects/parseltongue/GLOSSOPETRAE-worktrees/main-continue-20260630-084226`
Artifact root: `/Users/filipdam/projects/parseltongue/GLOSSOPETRAE-worktrees/main-continue-20260630-084226/autoresearch`

## Goal

Build and continuously improve an autoresearch program for a language-based memory/context compression algorithm for modern AI apps, using GLOSSOPETRAE's token/language machinery plus Hermes skills, plugins, memory providers, MCP/connectors, and current research.

## Success criteria

- Stack map is current, redacted, and backed by local files or verified source captures.
- Every iteration writes append-only findings with IDs and source pointers.
- Compression research outputs are evaluated with exact tokens where possible and downstream task-quality gates.
- No cron tick depends on prior chat context; all state comes from files under `autoresearch/`.
- No harmful payloads, secrets, credentials, or covert-channel deployment instructions are produced.
- `npm run autoresearch:validate` passes after each iteration; run `npm run test` whenever product code changes.

## Milestones

| ID | Status at init | Deliverable | Completion gate |
|---|---|---|---|
| M0 | in_progress | Redacted stack inventory + source capture hardening | `STACK_MAP.md` has skills/plugins/connectors/gaps; findings include verified local source pointers |
| M1 | pending | Memory-compression benchmark design | `findings/M1-benchmark-design.md` with corpus, metrics, baselines, failure modes |
| M2 | pending | Exact tokenizer integration plan | `findings/M2-tokenizer-plan.md` names concrete tokenizer APIs/libs and fallback provider-count methods |
| M3 | pending | Compression language/DSL design | `findings/M3-compression-language.md` with grammar/codebook options and audit model |
| M4 | pending | Memory provider comparison | `findings/M4-memory-provider-matrix.md` comparing local/cloud/graph/semantic stores |
| M5 | pending | Prototype implementation plan | `findings/M5-prototype-plan.md` with file-level targets and acceptance tests |
| M6 | pending | Controlled evaluation results | `findings/M6-eval-results.md` with exact tokens + downstream task scores |
| M7 | pending | MCP/tool/plugin integration spec | `findings/M7-integration-spec.md` with APIs and security boundaries |
| M8 | pending | Privacy/security/redaction review | `findings/M8-safety-review.md` with secret-leak and dual-use controls |
| M9 | pending | Final synthesis | `findings/M9-final-report.md` with recommendation and product/research next steps |

## Worker contract

Workers must:

1. Read this task spec and `state/progress.json` first.
2. Choose one milestone or one narrow subquestion.
3. Write a markdown report under `autoresearch/findings/` with an exact requested filename.
4. Return findings in JSONL-ready form: `id`, `milestone`, `claim`, `evidence`, `confidence`, `next_action`.
5. Verify at least one substantive claim from a primary/local source per report.
6. Avoid secrets and operational covert-channel content.
7. Keep reports under 300 lines unless explicitly split.

## Direction diversity rule

Before choosing a new direction, read `state/directions_tried.json`. A fresh direction must differ structurally from existing directions: e.g. exact tokenizer integration vs memory provider evaluation vs DSL grammar design vs benchmark construction.
