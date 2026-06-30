#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const repo = path.resolve(root, '..');
const required = [
  'README.md',
  'STACK_MAP.md',
  'RESEARCH_PROGRAM.md',
  'prompts/orchestrator.md',
  'prompts/worker.md',
  'prompts/heartbeat.md',
  'state/task_spec.md',
  'state/progress.json',
  'state/directions_tried.json',
  'state/findings.jsonl',
  'state/iteration_log.jsonl',
  'logs/orchestrator.jsonl',
  'logs/heartbeat.jsonl',
  'scripts/heartbeat-watchdog.py',
  'sources/external-memory-compression-sources.json',
];

const fail = (msg) => {
  console.error(`FAIL ${msg}`);
  process.exitCode = 1;
};

for (const rel of required) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) fail(`missing ${rel}`);
}

const parseJson = (rel) => {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
  } catch (err) {
    fail(`${rel} is not valid JSON: ${err.message}`);
    return null;
  }
};

const progress = parseJson('state/progress.json');
const directions = parseJson('state/directions_tried.json');
const sources = parseJson('sources/external-memory-compression-sources.json');

if (progress) {
  for (const key of ['task', 'framework', 'artifact_root', 'worktree', 'iteration', 'total_findings', 'last_seen', 'milestones']) {
    if (!(key in progress)) fail(`progress.json missing ${key}`);
  }
  for (const m of ['M0','M1','M2','M3','M4','M5','M6','M7','M8','M9']) {
    if (!(m in progress.milestones)) fail(`progress.json missing milestone ${m}`);
  }
}

if (directions && (!Array.isArray(directions.directions) || directions.directions.length === 0)) {
  fail('directions_tried.json has no directions');
}
if (!Array.isArray(sources) || sources.length === 0) fail('source capture JSON is empty');

const findingsPath = path.join(root, 'state/findings.jsonl');
const findingLines = fs.readFileSync(findingsPath, 'utf8').split('\n').filter(Boolean);
const ids = new Set();
for (let i = 0; i < findingLines.length; i++) {
  let row;
  try {
    row = JSON.parse(findingLines[i]);
  } catch (err) {
    fail(`findings.jsonl line ${i + 1} invalid JSON: ${err.message}`);
    continue;
  }
  for (const key of ['id', 'ts', 'milestone', 'claim', 'evidence', 'confidence', 'next_action']) {
    if (!(key in row)) fail(`finding line ${i + 1} missing ${key}`);
  }
  if (ids.has(row.id)) fail(`duplicate finding id ${row.id}`);
  ids.add(row.id);
  if (!Array.isArray(row.evidence) || row.evidence.length === 0) fail(`finding ${row.id} has no evidence`);
}
if (progress && progress.total_findings !== findingLines.length) {
  fail(`progress.total_findings=${progress.total_findings} but findings lines=${findingLines.length}`);
}

const taskSpec = fs.readFileSync(path.join(root, 'state/task_spec.md'), 'utf8');
for (const token of ['Deli_AutoResearch', 'M0', 'M9', 'Success criteria', 'Worker contract']) {
  if (!taskSpec.includes(token)) fail(`task_spec.md missing ${token}`);
}

for (const rel of ['README.md','STACK_MAP.md','RESEARCH_PROGRAM.md','prompts/orchestrator.md','prompts/worker.md']) {
  const txt = fs.readFileSync(path.join(root, rel), 'utf8');
  if (/\bTBD\b|TODO_PLACEHOLDER|INSERT_/.test(txt)) fail(`${rel} contains unresolved placeholder`);
}

if (!fs.existsSync(path.join(repo, 'package.json'))) fail('repo package.json not found from autoresearch script location');

if (!process.exitCode) {
  console.log(`OK autoresearch scaffold valid: ${findingLines.length} findings, ${directions?.directions?.length ?? 0} directions, ${sources.length} source captures`);
}
