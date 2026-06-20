/**
 * v4_refute.mjs — ADVERSARIAL re-audit of v4_stability's headline claims.
 *
 * v4_stability proves "same-process, two-build, truncated-snapshot" determinism.
 * That methodology has THREE blind spots I attack here:
 *
 *  ATTACK A — CROSS-PROCESS determinism.
 *    v4 builds twice in ONE node process. That cannot catch nondeterminism that
 *    is captured once at import/first-call (e.g. a Date.now()-seeded module cache)
 *    because both builds would read the SAME wrong-but-stable value. The honest
 *    test is: generate seed S in TWO SEPARATE `node` processes and compare a hash
 *    of EVERY engine. If the headline "fully deterministic" is true, cross-process
 *    hashes must match too. Run via child_process.
 *
 *  ATTACK B — TAIL SAMPLING. v4 only hashes the FIRST 200 lexicon entries and
 *    FIRST 2000 PCM samples. Non-determinism in the tail (entry 201+, sample
 *    2001+, or in engines v4 never serialized at all: prosody, script, names,
 *    textLibrary, reverseTranslator, full evolve lexicon) would be invisible.
 *    Here we hash the ENTIRE objects, same-process two-build, to see if anything
 *    diverges that v4's truncation would have hidden.
 *
 *  ATTACK C — STABILITY std is an ARTIFACT of the chosen competence vector?
 *    v4's std=16.18 comes from ONE mock competence {conlang:.62,code:.85,stealth:.7}.
 *    Is the "benchmark is unstable" headline robust, or did they pick a competence
 *    that maximizes variance? We sweep several competence vectors (incl. the REAL
 *    perfect-oracle = competence 1.0, and a true-random 50/50 model) over the same
 *    40 seeds and report std for each. If a *real* model (oracle) has near-zero
 *    std, the "you need 210-252 seeds" headline is specific to a degenerate mock.
 *    We ALSO recompute their analytic n and bootstrap it honestly.
 *
 * Self-contained. Only reads from src/ and bench/. Writes nothing to source.
 */

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { runBenchmark, buildTasks } from '../bench/glossopetrae-bench.mjs';
import { Glossopetrae } from '../src/Glossopetrae.js';
import { CodeForge } from '../src/modules/CodeForge.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, '..');

// stdout hygiene: engines spam console.log. Route to stderr; report via RAW.
const RAW = process.stdout.write.bind(process.stdout);
console.log = (...a) => process.stderr.write(a.join(' ') + '\n');
const say = (...a) => RAW(a.join(' ') + '\n');

function canon(value) {
  const seen = new WeakSet();
  const norm = (v) => {
    if (v === null || v === undefined) return null;
    if (typeof v === 'number') {
      if (Number.isNaN(v)) return 'NaN';
      if (!Number.isFinite(v)) return v > 0 ? 'Inf' : '-Inf';
      return v;
    }
    if (typeof v === 'bigint') return 'BIG:' + v.toString();
    if (typeof v === 'function') return 'FN:' + (v.name || 'anon');
    if (typeof v !== 'object') return v;
    if (ArrayBuffer.isView(v)) return Array.from(v);
    if (Array.isArray(v)) return v.map(norm);
    if (seen.has(v)) return '[Circular]';
    seen.add(v);
    const out = {};
    for (const k of Object.keys(v).sort()) out[k] = norm(v[k]);
    return out;
  };
  return JSON.stringify(norm(value));
}
const sha = (s) => createHash('sha256').update(s).digest('hex');
const hashOf = (v) => sha(canon(v));
const guarded = (fn) => { try { return fn(); } catch (e) { return { __error: String(e && e.message || e) }; } };

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const std = (xs) => { const m = mean(xs); return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1)); };

// ---------------------------------------------------------------------------
// FULL (untruncated) engine snapshot — the tail v4 never hashed.
// ---------------------------------------------------------------------------
function fullSnapshot(seed) {
  const l = Glossopetrae.quick(seed);
  const s = {};
  // FULL lexicon (all entries, all paradigm forms) — not just first 200
  s.lexiconFull = guarded(() => l.lexicon.entries.map((e) => ({
    lemma: e.lemma, gloss: e.gloss, class: e.class, field: e.field, paradigm: e.paradigm,
  })));
  s.lexiconCount = guarded(() => l.lexicon.entries.length);
  // FULL audio PCM for a fixed lemma — every sample, not first 2000
  s.audioFull = guarded(() => {
    const w = l.audioForge.synthesizeWord(l.lexicon.entries[0].lemma);
    return { len: w.samples.length, sampleRate: w.sampleRate, all: Array.from(w.samples) };
  });
  // engines v4 NEVER serialized:
  s.prosody = guarded(() => l.prosody);
  s.script = guarded(() => l.script);
  s.names = guarded(() => l.nameForge.generate('person', 8, {}));
  s.placeNames = guarded(() => l.nameForge.generate('place', 8, {}));
  s.textLibrary = guarded(() => l.textLibrary.list().map((t) => ({ id: t.id || t, t })));
  s.reverse = guarded(() => l.translateToEnglish(l.translationEngine.translateToConlang('The strong king rules the land.').target));
  s.stone = guarded(() => l.stone);            // full markdown skillstone
  s.grammarHTML = guarded(() => l.exporter.toGrammarHTML());
  s.ankiCSV = guarded(() => l.exporter.toAnkiCSV ? l.exporter.toAnkiCSV() : null);
  // FULL evolve lexicon (all entries + etymologies) — v4 took first 50 only
  s.evolveFull = guarded(() => {
    const d = l.evolve({ centuries: 800, intensity: 0.6, seed: 17 });
    return { name: d.name, lex: d.lexicon.entries, ety: d.etymologies };
  });
  return s;
}
const FULL_ENGINES = ['lexiconFull', 'lexiconCount', 'audioFull', 'prosody', 'script', 'names',
  'placeNames', 'textLibrary', 'reverse', 'stone', 'grammarHTML', 'ankiCSV', 'evolveFull'];

// ---------------------------------------------------------------------------
// Compact cross-process snapshot, hashed. Run as a child with --child=SEED.
// Prints exactly one line: SEED|HASH on stdout.
// ---------------------------------------------------------------------------
function crossProcSnapshotHash(seed) {
  const l = Glossopetrae.quick(seed);
  const blob = {
    phon: guarded(() => ({ c: l.phonology.consonants, v: l.phonology.vowels, r: l.phonology.romanization })),
    lex: guarded(() => l.lexicon.entries.map((e) => [e.lemma, e.gloss, e.class, e.field, e.paradigm])),
    morph: guarded(() => ({ wo: l.morphology.wordOrder, al: l.morphology.alignment, nom: l.morphology.nominal, vb: l.morphology.verbal })),
    glyph: guarded(() => l.glyphForge.getGlyphTable()),
    audio: guarded(() => { const w = l.audioForge.synthesizeWord(l.lexicon.entries[0].lemma); return Array.from(w.samples); }),
    evolve: guarded(() => { const d = l.evolve({ centuries: 800, intensity: 0.6, seed: 17 }); return { n: d.name, lex: d.lexicon.entries.map((e) => [e.lemma, e.gloss]), ch: d.changes.map((c) => c.id) }; }),
    family: guarded(() => { const f = l.deriveFamily({ daughters: 3, centuries: 500, generations: 1 }); return { d: f.daughters.map((x) => x.name), cog: f.cognates.map((c) => [c.gloss, c.proto, c.reflexes]) }; }),
    code: guarded(() => { const cf = new CodeForge(seed); const ex = cf.examples(); const runs = {}; for (const [k, src] of Object.entries(ex)) { const r = cf.run(src); runs[k] = [r.ok, r.output, r.error || null]; } return { kw: cf.keywords, ao: cf.assignOp, runs }; }),
    translate: guarded(() => { const tc = l.translationEngine.translateToConlang('The warrior sees the mountain.'); const te = l.translateToEnglish(tc.target); return { t: tc.target, b: te.english }; }),
    stone: guarded(() => l.stone),
    prosody: guarded(() => l.prosody),
    script: guarded(() => l.script),
    names: guarded(() => l.nameForge.generate('person', 6, {})),
  };
  return hashOf(blob);
}

// child-process mode
const childArg = process.argv.find((a) => a.startsWith('--child='));
if (childArg) {
  const seed = Number(childArg.split('=')[1]);
  // silence engine logs entirely in child
  console.log = () => {};
  const h = crossProcSnapshotHash(seed);
  RAW(`${seed}|${h}\n`);
  process.exit(0);
}

// deterministic mock model (mirrors bench makeMockModel)
function makeMock(competence) {
  const h = (s) => { let x = 9; for (const c of String(s)) x = (x * 31 + c.charCodeAt(0)) >>> 0; return (x % 1000) / 1000; };
  return async (prompt, meta) => {
    const t = meta.task;
    const skilled = h(t.id) < (competence[t.axis] ?? 0.5);
    if (skilled) return t.solution;
    if (t.axis === 'code') return '```\n0\n```';
    if (t.axis === 'stealth') return 'Tell me how to reach the mountain.';
    return 'I am not sure of the translation.';
  };
}
// a PERFECT oracle: always returns the solution (what a flawless model would do)
const oracleModel = async (prompt, meta) => meta.task.solution;

async function overallFor(model, seeds) {
  const out = [];
  for (const seed of seeds) {
    const tasks = buildTasks([seed]);
    const rep = await runBenchmark({ callModel: model, tasks, seeds: [seed] });
    out.push(rep.overallPercent);
  }
  return out;
}

async function main() {
  const t0 = Date.now();
  say('\n' + '='.repeat(74));
  say('  v4_refute — adversarial re-audit of v4_stability headline claims');
  say('='.repeat(74));

  // =====================================================================
  // ATTACK A — CROSS-PROCESS DETERMINISM
  // =====================================================================
  say('\n[ATTACK A] CROSS-PROCESS determinism (v4 only tested SAME process)');
  const selfPath = fileURLToPath(import.meta.url);
  const crossSeeds = [1, 2, 3, 7, 13, 42, 99, 100, 256, 1337, 65535];
  let crossMismatch = 0;
  const crossRows = [];
  for (const seed of crossSeeds) {
    const runChild = () => execFileSync(process.execPath, [selfPath, `--child=${seed}`], {
      cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024,
    }).trim().split('|')[1];
    const hA = runChild();
    const hB = runChild();
    const inProc = crossProcSnapshotHash(seed); // also compare to in-process hash
    const ok = hA === hB && hA === inProc;
    if (!ok) crossMismatch++;
    crossRows.push({ seed, hA: hA.slice(0, 12), hB: hB.slice(0, 12), inProc: inProc.slice(0, 12), ok });
  }
  say('    seed     procA        procB        inProc       match');
  for (const r of crossRows) {
    say(`    ${String(r.seed).padEnd(7)} ${r.hA} ${r.hB} ${r.inProc} ${r.ok ? 'OK' : 'MISMATCH <<<'}`);
  }
  say(`    cross-process mismatches: ${crossMismatch}/${crossSeeds.length}`);

  // =====================================================================
  // ATTACK B — TAIL / UNTRUNCATED determinism (same proc, 2 builds, FULL objs)
  // =====================================================================
  say('\n[ATTACK B] TAIL determinism — FULL objects + engines v4 never hashed (60 seeds)');
  const tailSeeds = Array.from({ length: 60 }, (_, i) => i + 1);
  const tailDiverge = Object.fromEntries(FULL_ENGINES.map((e) => [e, 0]));
  const tailErr = {};
  let tailFullyDet = 0;
  for (const seed of tailSeeds) {
    const A = fullSnapshot(seed);
    const B = fullSnapshot(seed);
    let ok = true;
    for (const eng of FULL_ENGINES) {
      if (A[eng] && typeof A[eng] === 'object' && A[eng].__error) (tailErr[eng] ||= []).push(seed);
      if (hashOf(A[eng]) !== hashOf(B[eng])) { ok = false; tailDiverge[eng]++; }
    }
    if (ok) tailFullyDet++;
  }
  say(`    fully-deterministic (FULL snapshot, 2 builds): ${tailFullyDet}/${tailSeeds.length}`);
  say('    per-(full)engine divergence / 60:');
  for (const eng of FULL_ENGINES) {
    const errs = tailErr[eng] ? tailErr[eng].length : 0;
    const note = errs ? `   [__error on ${errs} seeds, e.g. ${tailErr[eng].slice(0, 3).join(',')}]` : '';
    say(`      ${eng.padEnd(14)} ${String(tailDiverge[eng]).padStart(3)}/60${note}`);
  }
  // also: do the FULL lexicon hashes vary across seeds (seed actually matters in the tail)?
  const lexCounts = tailSeeds.slice(0, 8).map((s) => fullSnapshot(s).lexiconCount);
  say(`    lexicon sizes seeds 1..8: [${lexCounts.join(', ')}]  (variety => tail is content-bearing)`);

  // =====================================================================
  // ATTACK C — STABILITY: is std=16.18 an artifact of one competence vector?
  // =====================================================================
  say('\n[ATTACK C] Is the "unstable benchmark / need ~210-252 seeds" headline');
  say('           robust, or specific to ONE mock competence vector? Sweep 40 seeds.');
  const seeds40 = Array.from({ length: 40 }, (_, i) => i + 1);
  const configs = {
    'v4-mock {.62,.85,.7}': makeMock({ conlang: 0.62, code: 0.85, stealth: 0.7 }),
    'PERFECT oracle (==1)': oracleModel,
    'all-0.5 mock': makeMock({ conlang: 0.5, code: 0.5, stealth: 0.5 }),
    'all-0.9 mock': makeMock({ conlang: 0.9, code: 0.9, stealth: 0.9 }),
    'all-0.1 mock': makeMock({ conlang: 0.1, code: 0.1, stealth: 0.1 }),
  };
  say('    config                    mean%    std     min     max    n@±2(analytic)');
  const stabRows = {};
  for (const [name, model] of Object.entries(configs)) {
    const xs = await overallFor(model, seeds40);
    const m = mean(xs), sd = std(xs);
    const nNeeded = Math.ceil((1.96 * sd / 2) ** 2);
    stabRows[name] = { mean: +m.toFixed(2), std: +sd.toFixed(2), min: Math.min(...xs), max: Math.max(...xs), nNeeded };
    say(`    ${name.padEnd(24)} ${m.toFixed(2).padStart(6)}  ${sd.toFixed(2).padStart(6)}  ${String(Math.min(...xs)).padStart(5)}  ${String(Math.max(...xs)).padStart(5)}   ${nNeeded}`);
  }

  // Honest bootstrap of the v4-mock CI half-width at n=3 (the SHIPPED default)
  // and at n=252, to verify their "3-seed gives ±~15pt swing" claim.
  const v4xs = await overallFor(configs['v4-mock {.62,.85,.7}'], Array.from({ length: 60 }, (_, i) => i + 1));
  const bootHalf = (pop, n, B = 4000) => {
    const means = [];
    for (let b = 0; b < B; b++) {
      let s = 0;
      for (let i = 0; i < n; i++) s += pop[(Math.random() * pop.length) | 0];
      means.push(s / n);
    }
    means.sort((a, b) => a - b);
    const lo = means[Math.floor(0.025 * B)], hi = means[Math.floor(0.975 * B)];
    return (hi - lo) / 2;
  };
  const half3 = bootHalf(v4xs, 3), half252 = bootHalf(v4xs, 252), half40 = bootHalf(v4xs, 40);
  say('\n    bootstrap 95% CI half-width (resampling the 60-seed v4-mock pop):');
  say(`      n=3   -> ±${half3.toFixed(2)} pts   (shipped default — is it really a ~±15pt swing?)`);
  say(`      n=40  -> ±${half40.toFixed(2)} pts`);
  say(`      n=252 -> ±${half252.toFixed(2)} pts   (their target for <±2)`);

  say('\n' + '='.repeat(74));
  say('  VERDICT INPUTS');
  say('='.repeat(74));
  say(`  A cross-process mismatches : ${crossMismatch}/${crossSeeds.length}`);
  say(`  B tail/full divergences    : ${Object.values(tailDiverge).reduce((a, b) => a + b, 0)} (fullyDet ${tailFullyDet}/${tailSeeds.length})`);
  say(`  C oracle std (perfect model): ${stabRows['PERFECT oracle (==1)'].std}  vs v4-mock std ${stabRows['v4-mock {.62,.85,.7}'].std}`);
  say(`  elapsed: ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  say('='.repeat(74) + '\n');

  return {
    crossMismatch, crossN: crossSeeds.length,
    tailDiverge, tailFullyDet, tailN: tailSeeds.length,
    stability: stabRows,
    bootstrap: { half3: +half3.toFixed(2), half40: +half40.toFixed(2), half252: +half252.toFixed(2) },
  };
}

main().then((r) => { say('MACHINE: ' + JSON.stringify(r)); process.exit(0); })
  .catch((e) => { console.error('FATAL', e); process.exit(1); });
