# GLOSSOPETRAE Autoresearch Gigathing

This directory turns the previous inventory/research session into a durable Deli_AutoResearch workspace for a language-based memory/context compression research program.

The target is not a one-off note. It is a stateful research loop with:

- explicit task spec and milestones;
- append-only findings;
- direction history to prevent cognitive loops;
- orchestrator and heartbeat prompts/scripts for Hermes cron;
- a local validator so future agents can prove the scaffold is intact before iterating.

## Scope

Research question: can GLOSSOPETRAE-style generated languages, controlled DSLs, token-aware rewriting, and memory-provider infrastructure produce a practical memory/context compression layer for modern AI apps while preserving downstream task quality, auditability, and privacy?

The program is safety-bounded: use benign memory/context-compression corpora and evaluation tasks only. Do not operationalize covert-channel or evasion payloads. Treat GLOSSOPETRAE's dual-use modules as measurement and stress-test fixtures, not deployment recipes.

## Layout

```text
autoresearch/
  README.md
  STACK_MAP.md                         # stack inventory + rollout
  RESEARCH_PROGRAM.md                  # research thesis, phases, metrics
  prompts/
    orchestrator.md                    # self-contained Hermes cron prompt
    worker.md                          # delegate_task worker prompt
    heartbeat.md                       # L1 watchdog prompt
  state/
    task_spec.md                       # Deli_AutoResearch task contract
    progress.json
    directions_tried.json
    findings.jsonl
    iteration_log.jsonl
  logs/
    orchestrator.jsonl
    heartbeat.jsonl
  scripts/
    validate-autoresearch.mjs
    heartbeat-watchdog.py
  sources/
    external-memory-compression-sources.json
```

## Verify

From the worktree root:

```bash
npm run autoresearch:validate
npm run test
```

The first command validates this autoresearch scaffold. The second is the repo's existing smoke/integrity suite.

## Cron deployment

- Orchestrator prompt: `autoresearch/prompts/orchestrator.md`
- Heartbeat script: `autoresearch/scripts/heartbeat-watchdog.py`
- Heartbeat agent prompt, if you prefer agent-mode instead of no-agent script-mode: `autoresearch/prompts/heartbeat.md`

In this CLI session, Hermes cron output is local-only unless a gateway delivery target is explicitly configured. Jobs should still persist output in the cron job store and write state/log files here.

## Current status

Initialized at `2026-06-30T09:57:04.801684Z` in the specialized worktree:

`/Users/filipdam/projects/parseltongue/GLOSSOPETRAE-worktrees/main-continue-20260630-084226`

Next autonomous tick should start at M0/M1: harden the stack inventory, then produce the first compression-evaluation design note.
