/**
 * E1 — Does GLOSSOPETRAE reliably produce VALID, DIVERSE, Turing-capable
 *      programming languages?
 *
 * THESIS UNDER TEST (substrate claim for the coding-uplift work):
 *   CodeForge, seeded by an integer, deterministically mints a *novel* small
 *   imperative language whose generated interpreter correctly executes the
 *   constructs a real benchmark needs (variables, arithmetic, conditionals,
 *   loops, functions, recursion, booleans, print, string concat). If this
 *   affordance does not reliably exist, the whole coding-uplift programme has
 *   no substrate.
 *
 * METHOD:
 *   For >= 500 distinct seeds, build a fresh CodeForge(seed) and run a BATTERY
 *   of canonical programs written in THAT language's OWN generated syntax.
 *   Each program's output is compared against an INDEPENDENT plain-JS reference
 *   computed here (the JS is the ground truth; the conlang interpreter is the
 *   system under test). A language "passes" only if EVERY battery program
 *   produces the exact expected output.
 *
 *   Battery (9 programs): print literal; sum 1..N (loop); factorial(n)
 *   recursion; fibonacci(n) recursion; while countdown; FizzBuzz 1..15
 *   (nested if/else); string concat; boolean logic (and/or/not + cmp);
 *   function w/ params returning a value.
 *
 *   Plus DIVERSITY, DEGENERACY, FEATURE-COVERAGE, and DETERMINISM analyses.
 *
 * SAFETY: benign content only (sentinel words bridge/harbor/falcon, arithmetic,
 * FizzBuzz). This is capability MEASUREMENT, not deployment.
 *
 * PERFORMANCE: building one CodeForge generates a full natural language
 * (~1.3s), so 500 of them are sharded across CPU cores via child_process.fork
 * (zero external deps). Workers do the per-language work and ship back small
 * JSON; the main process aggregates and does the cheap O(N^2) overlap pass.
 * Engines are deterministic from seed, so sharding does not affect results.
 *
 * Run:  node validation/thesis/e1_codelang_space.mjs
 */

import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import { CodeForge } from '../../src/modules/CodeForge.js';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const N_SEEDS = 500;
const SEED_START = 1; // seeds 1..500 (deterministic, reproducible corpus)
const SEEDS = Array.from({ length: N_SEEDS }, (_, i) => SEED_START + i);
const RUN_OPTS = { maxSteps: 5_000_000, maxDepth: 2000 };

// ---------------------------------------------------------------------------
// Independent JS reference implementations (GROUND TRUTH)
// ---------------------------------------------------------------------------
const refFac = (n) => (n <= 1 ? 1 : n * refFac(n - 1));
const refFib = (n) => (n < 2 ? n : refFib(n - 1) + refFib(n - 2));
const refSum = (n) => (n * (n + 1)) / 2;
const refCountdown = (n) => { const o = []; for (let i = n; i >= 1; i--) o.push(String(i)); return o.join('\n'); };
const refFizz = (n) => {
  const o = [];
  for (let i = 1; i <= n; i++) o.push(i % 15 === 0 ? 'FizzBuzz' : i % 3 === 0 ? 'Fizz' : i % 5 === 0 ? 'Buzz' : String(i));
  return o.join('\n');
};

// Benign constants.
const SUM_N = 100;       // 1..100 = 5050
const FAC_N = 6;         // 6! = 720
const FIB_N = 15;        // fib(15) = 610
const COUNT_N = 5;       // countdown 5..1
const STR_A = 'harbor', STR_B = 'falcon';
const PRINT_LIT = 'bridge';

// ---------------------------------------------------------------------------
// Syntax helper
// ---------------------------------------------------------------------------
function syn(cf) {
  return {
    K: cf.keywords,
    t: cf.terminator,
    a: cf.assignOp,
    bo: cf.blockStyle === 'word' ? cf.blockOpen : '{',
    bc: cf.blockStyle === 'word' ? cf.blockClose : '}',
  };
}

// ---------------------------------------------------------------------------
// Battery — each program written in the GENERATED language's OWN syntax.
// ---------------------------------------------------------------------------
const BATTERY = [
  { name: 'print_literal', needs: ['print', 'string'],
    src: (cf, { K, t }) => `${K.print} "${PRINT_LIT}"${t}`,
    expected: () => PRINT_LIT },
  { name: 'sum_1_to_N', needs: ['let', 'assign', 'while', 'arith', 'print'],
    src: (cf, { K, t, a, bo, bc }) =>
      `${K.let} total ${a} 0${t}\n${K.let} i ${a} 1${t}\n` +
      `${K.while} (i <= ${SUM_N}) ${bo} total ${a} total + i${t} i ${a} i + 1${t} ${bc}\n${K.print} total${t}`,
    expected: () => String(refSum(SUM_N)) },
  { name: 'factorial_recursive', needs: ['func', 'if', 'else', 'return', 'recursion', 'arith', 'print'],
    src: (cf, { K, t, bo, bc }) =>
      `${K.func} fac(n) ${bo}\n  ${K.if} (n <= 1) ${bo} ${K.return} 1${t} ${bc} ${K.else} ${bo} ${K.return} n * fac(n - 1)${t} ${bc}\n${bc}\n${K.print} fac(${FAC_N})${t}`,
    expected: () => String(refFac(FAC_N)) },
  { name: 'fibonacci_recursive', needs: ['func', 'if', 'else', 'return', 'recursion', 'arith', 'print'],
    src: (cf, { K, t, bo, bc }) =>
      `${K.func} fib(n) ${bo}\n  ${K.if} (n < 2) ${bo} ${K.return} n${t} ${bc} ${K.else} ${bo} ${K.return} fib(n - 1) + fib(n - 2)${t} ${bc}\n${bc}\n${K.print} fib(${FIB_N})${t}`,
    expected: () => String(refFib(FIB_N)) },
  { name: 'while_countdown', needs: ['let', 'assign', 'while', 'arith', 'print'],
    src: (cf, { K, t, a, bo, bc }) =>
      `${K.let} i ${a} ${COUNT_N}${t}\n${K.while} (i >= 1) ${bo} ${K.print} i${t} i ${a} i - 1${t} ${bc}`,
    expected: () => refCountdown(COUNT_N) },
  { name: 'fizzbuzz_1_to_15', needs: ['let', 'assign', 'while', 'if', 'else', 'arith', 'string', 'print'],
    src: (cf, { K, t, a, bo, bc }) =>
      `${K.let} i ${a} 1${t}\n${K.while} (i <= 15) ${bo}\n` +
      `  ${K.if} (i % 15 == 0) ${bo} ${K.print} "FizzBuzz"${t} ${bc}\n` +
      `  ${K.else} ${bo} ${K.if} (i % 3 == 0) ${bo} ${K.print} "Fizz"${t} ${bc}\n` +
      `  ${K.else} ${bo} ${K.if} (i % 5 == 0) ${bo} ${K.print} "Buzz"${t} ${bc} ${K.else} ${bo} ${K.print} i${t} ${bc} ${bc} ${bc}\n` +
      `  i ${a} i + 1${t}\n${bc}`,
    expected: () => refFizz(15) },
  { name: 'string_concat', needs: ['print', 'string', 'concat'],
    src: (cf, { K, t }) => `${K.print} "${STR_A}" + "${STR_B}"${t}`,
    expected: () => STR_A + STR_B },
  { name: 'boolean_logic', needs: ['print', 'bool', 'and', 'or', 'not', 'cmp'],
    src: (cf, { K, t }) =>
      `${K.print} (3 > 2) ${K.and} (${K.not} (1 == 2))${t}\n${K.print} (1 > 2) ${K.or} (5 == 5)${t}`,
    expected: (cf) => `${cf.keywords.true}\n${cf.keywords.true}` },
  { name: 'func_params_return', needs: ['func', 'return', 'arith', 'print'],
    src: (cf, { K, t, bo, bc }) =>
      `${K.func} add(a, b) ${bo} ${K.return} a + b${t} ${bc}\n${K.print} add(40, 2)${t}`,
    expected: () => '42' },
];

// ---------------------------------------------------------------------------
// Feature probes — minimal per-construct programs (independent of battery).
// ---------------------------------------------------------------------------
const FEATURE_PROBES = {
  variables:    { src: (cf, s) => `${s.K.let} x ${s.a} 7${s.t} ${s.K.print} x${s.t}`, exp: () => '7' },
  arithmetic:   { src: (cf, s) => `${s.K.print} 2 + 3 * 4 - 1${s.t}`, exp: () => String(2 + 3 * 4 - 1) },
  conditionals: { src: (cf, s) => `${s.K.if} (1 < 2) ${s.bo} ${s.K.print} "y"${s.t} ${s.bc} ${s.K.else} ${s.bo} ${s.K.print} "n"${s.t} ${s.bc}`, exp: () => 'y' },
  loops:        { src: (cf, s) => `${s.K.let} i ${s.a} 0${s.t} ${s.K.let} c ${s.a} 0${s.t} ${s.K.while} (i < 4) ${s.bo} c ${s.a} c + 1${s.t} i ${s.a} i + 1${s.t} ${s.bc} ${s.K.print} c${s.t}`, exp: () => '4' },
  functions:    { src: (cf, s) => `${s.K.func} sq(n) ${s.bo} ${s.K.return} n * n${s.t} ${s.bc} ${s.K.print} sq(9)${s.t}`, exp: () => '81' },
  recursion:    { src: (cf, s) => `${s.K.func} f(n) ${s.bo} ${s.K.if} (n <= 0) ${s.bo} ${s.K.return} 0${s.t} ${s.bc} ${s.K.else} ${s.bo} ${s.K.return} n + f(n - 1)${s.t} ${s.bc} ${s.bc} ${s.K.print} f(10)${s.t}`, exp: () => '55' },
  booleans:     { src: (cf, s) => `${s.K.print} ${s.K.true} ${s.K.and} ${s.K.not} ${s.K.false}${s.t}`, exp: (cf) => cf.keywords.true },
  print:        { src: (cf, s) => `${s.K.print} "ok"${s.t}`, exp: () => 'ok' },
};

// ===========================================================================
// WORKER: process a shard of seeds, return compact per-language results.
// ===========================================================================
function processSeed(seed) {
  const cf = new CodeForge(seed);
  const s = syn(cf);

  // Battery
  const battery = {}; // name -> {pass, expected, got, error}
  let allPass = true;
  for (const prog of BATTERY) {
    const exp = prog.expected(cf);
    const r = cf.run(prog.src(cf, s), RUN_OPTS);
    const got = r.ok ? r.output.trim() : null;
    const pass = r.ok && got === exp;
    if (!pass) allPass = false;
    battery[prog.name] = { pass, expected: exp, got: pass ? null : got, error: r.error || null };
  }

  // Degeneracy
  const problems = [];
  for (const [concept, w] of Object.entries(cf.keywords)) {
    if (!w || typeof w !== 'string' || !/^[a-z]+$/.test(w)) problems.push(`bad-keyword:${concept}=${JSON.stringify(w)}`);
  }
  const kwAll = Object.values(cf.keywords).concat(cf.blockStyle === 'word' ? [cf.blockOpen, cf.blockClose] : []);
  const hasCollision = new Set(kwAll).size !== kwAll.length;
  if (hasCollision) problems.push('duplicate-keyword');
  let ex = null;
  try { ex = cf.examples(); } catch { problems.push('examples()-threw'); }
  if (ex) for (const [exName, exSrc] of Object.entries(ex)) {
    const r = cf.run(exSrc, RUN_OPTS);
    if (!r.ok) problems.push(`example-fails:${exName}:${r.error}`);
  }
  const basic = cf.run(`${s.K.print} 1 + 1${s.t}`, RUN_OPTS);
  if (!basic.ok || basic.output.trim() !== '2') problems.push(`basic-1+1:${basic.error || basic.output}`);

  // Feature coverage
  const features = {};
  for (const [feat, probe] of Object.entries(FEATURE_PROBES)) {
    const r = cf.run(probe.src(cf, s), RUN_OPTS);
    const exp = probe.exp(cf);
    features[feat] = { ok: r.ok && r.output.trim() === exp, exp, got: r.ok ? r.output.trim() : null, error: r.error || null };
  }

  return {
    seed,
    keywords: cf.keywords,          // concept -> keyword string
    assignOp: cf.assignOp,
    blockStyle: cf.blockStyle,
    blockOpen: cf.blockOpen,
    blockClose: cf.blockClose,
    allPass,
    battery,
    hasCollision,
    problems,
    features,
  };
}

const __filename = fileURLToPath(import.meta.url);

if (process.argv[2] === '--worker') {
  // Worker mode: read seed shard from stdin (JSON array), emit results.
  let buf = '';
  process.stdin.on('data', (d) => (buf += d));
  process.stdin.on('end', () => {
    const seeds = JSON.parse(buf);
    const results = seeds.map(processSeed);
    process.stdout.write(JSON.stringify(results));
  });
} else {
  await main();
}

// ===========================================================================
// MAIN: shard seeds across workers, aggregate, analyse, report.
// ===========================================================================
async function main() {
  const t0 = Date.now();
  const nWorkers = Math.min(os.cpus().length, 16);
  const shards = Array.from({ length: nWorkers }, () => []);
  SEEDS.forEach((s, i) => shards[i % nWorkers].push(s));

  const runShard = (seeds) => new Promise((resolve, reject) => {
    const child = fork(__filename, ['--worker'], { stdio: ['pipe', 'pipe', 'inherit', 'ipc'] });
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code !== 0) return reject(new Error(`worker exited ${code}`));
      try { resolve(JSON.parse(out)); } catch (e) { reject(e); }
    });
    child.stdin.write(JSON.stringify(seeds));
    child.stdin.end();
  });

  const shardResults = await Promise.all(shards.filter((s) => s.length).map(runShard));
  const results = shardResults.flat().sort((a, b) => a.seed - b.seed);
  const buildMs = Date.now() - t0;

  console.log('========================================================');
  console.log('  E1 — CODE-LANGUAGE SPACE: validity, diversity, coverage');
  console.log(`  corpus: ${N_SEEDS} seeds (${SEED_START}..${SEED_START + N_SEEDS - 1})`);
  console.log(`  build+run wall time: ${(buildMs / 1000).toFixed(1)}s across ${nWorkers} workers`);
  console.log('========================================================\n');

  if (results.length !== N_SEEDS) {
    console.log(`!! expected ${N_SEEDS} results, got ${results.length} — aborting`);
    process.exit(1);
  }

  // ----- PART 1: functional battery -----
  const fullyFunctional = results.filter((r) => r.allPass).length;
  const perProgramPass = Object.fromEntries(BATTERY.map((b) => [b.name, 0]));
  const batteryFailures = [];
  for (const r of results) {
    for (const b of BATTERY) {
      if (r.battery[b.name].pass) perProgramPass[b.name]++;
      else if (batteryFailures.length < 50) {
        const f = r.battery[b.name];
        batteryFailures.push({ seed: r.seed, program: b.name, expected: f.expected, got: f.got, error: f.error });
      }
    }
  }
  console.log('[PART 1] Functional battery — % of languages where ALL 9 programs are correct');
  console.log(`  fully functional: ${fullyFunctional}/${N_SEEDS}  (${((fullyFunctional / N_SEEDS) * 100).toFixed(2)}%)\n`);
  console.log('  per-program pass counts:');
  for (const b of BATTERY) {
    const c = perProgramPass[b.name];
    console.log(`    ${b.name.padEnd(22)} ${c}/${N_SEEDS}  (${((c / N_SEEDS) * 100).toFixed(2)}%)`);
  }
  if (batteryFailures.length) {
    console.log('\n  FAILURES (up to 50):');
    for (const f of batteryFailures) {
      const g = f.error ? `ERROR: ${f.error}` : JSON.stringify(f.got);
      console.log(`    seed ${f.seed} / ${f.program}: expected ${JSON.stringify(f.expected)} got ${g}`);
    }
  } else {
    console.log('\n  NO battery failures across the entire corpus.');
  }

  // ----- PART 2: diversity -----
  console.log('\n[PART 2] Diversity across the corpus');
  const collisionLangs = results.filter((r) => r.hasCollision).length;
  console.log(`  within-language keyword collisions: ${collisionLangs}/${N_SEEDS} languages have a collision  (want 0)`);

  const sigs = new Set(results.map((r) => JSON.stringify(r.keywords)));
  console.log(`  distinct keyword signatures: ${sigs.size}/${N_SEEDS}  (${((sigs.size / N_SEEDS) * 100).toFixed(2)}% unique whole-vocabularies)`);

  const assignDist = {};
  for (const r of results) assignDist[r.assignOp] = (assignDist[r.assignOp] || 0) + 1;
  console.log('  assignOp distribution:');
  for (const [op, c] of Object.entries(assignDist).sort((a, b) => b[1] - a[1]))
    console.log(`    ${JSON.stringify(op).padEnd(8)} ${c}  (${((c / N_SEEDS) * 100).toFixed(1)}%)`);

  const blockDist = {};
  for (const r of results) blockDist[r.blockStyle] = (blockDist[r.blockStyle] || 0) + 1;
  console.log('  blockStyle distribution:');
  for (const [st, c] of Object.entries(blockDist).sort((a, b) => b[1] - a[1]))
    console.log(`    ${st.padEnd(8)} ${c}  (${((c / N_SEEDS) * 100).toFixed(1)}%)`);

  // Pairwise concept-aligned keyword overlap (exact O(N^2), cheap on small JSON).
  const conceptKeys = Object.keys(results[0].keywords);
  const CONCEPT_COUNT = conceptKeys.length;
  const kwArrays = results.map((r) => conceptKeys.map((k) => r.keywords[k]));
  let pairCount = 0, overlapSum = 0, overlapMax = 0;
  const sharedHist = new Array(CONCEPT_COUNT + 1).fill(0);
  for (let i = 0; i < kwArrays.length; i++) {
    for (let j = i + 1; j < kwArrays.length; j++) {
      let shared = 0;
      for (let k = 0; k < CONCEPT_COUNT; k++) if (kwArrays[i][k] === kwArrays[j][k]) shared++;
      const frac = shared / CONCEPT_COUNT;
      overlapSum += frac;
      if (frac > overlapMax) overlapMax = frac;
      sharedHist[shared]++;
      pairCount++;
    }
  }
  const meanOverlap = overlapSum / pairCount;
  console.log(`  pairwise keyword overlap (concept-aligned, ${pairCount} pairs):`);
  console.log(`    mean overlap: ${(meanOverlap * 100).toFixed(3)}%   max overlap: ${(overlapMax * 100).toFixed(2)}% (= ${Math.round(overlapMax * CONCEPT_COUNT)}/${CONCEPT_COUNT} keywords)`);
  console.log(`    pairs sharing exactly k keywords (k=0..${CONCEPT_COUNT}):`);
  console.log('      ' + sharedHist.map((c, k) => `${k}:${c}`).join('  '));

  console.log('  distinct keyword strings per concept across corpus:');
  let line = '    ';
  for (let k = 0; k < conceptKeys.length; k++) {
    const distinct = new Set(results.map((r) => r.keywords[conceptKeys[k]])).size;
    line += `${conceptKeys[k].padEnd(7)} ${String(distinct).padStart(3)}/${N_SEEDS}   `;
    if ((k + 1) % 3 === 0) { console.log(line.trimEnd()); line = '    '; }
  }
  if (line.trim()) console.log(line.trimEnd());

  // ----- PART 3: degeneracy -----
  console.log('\n[PART 3] Degeneracy check (defect = empty/dup keyword, can\'t run examples(), or can\'t run a basic program)');
  const degen = results.filter((r) => r.problems.length);
  console.log(`  degenerate languages: ${degen.length}/${N_SEEDS}`);
  if (degen.length) for (const r of degen.slice(0, 30)) console.log(`    seed ${r.seed}: ${r.problems.join('; ')}`);
  else console.log('  none — every language tokenizes/parses/runs its own examples and a basic program.');

  // ----- PART 4: feature coverage -----
  console.log('\n[PART 4] Feature coverage — every language must support every benchmark construct');
  const featureCoverage = Object.fromEntries(Object.keys(FEATURE_PROBES).map((f) => [f, 0]));
  const featureMisses = [];
  for (const r of results) {
    for (const [feat, res] of Object.entries(r.features)) {
      if (res.ok) featureCoverage[feat]++;
      else if (featureMisses.length < 30) featureMisses.push({ seed: r.seed, feature: feat, exp: res.exp, got: res.got, error: res.error });
    }
  }
  console.log('  per-feature coverage (languages supporting the construct):');
  let allFeaturesUniversal = true;
  for (const [feat, c] of Object.entries(featureCoverage)) {
    if (c !== N_SEEDS) allFeaturesUniversal = false;
    console.log(`    ${feat.padEnd(13)} ${c}/${N_SEEDS}  (${((c / N_SEEDS) * 100).toFixed(2)}%)`);
  }
  if (featureMisses.length) {
    console.log('  feature misses:');
    for (const m of featureMisses) console.log(`    seed ${m.seed} / ${m.feature}: exp ${JSON.stringify(m.exp)} got ${m.error ? 'ERROR:' + m.error : JSON.stringify(m.got)}`);
  }

  // ----- PART 5: determinism spot-check (in-main, direct CodeForge) -----
  console.log('\n[PART 5] Determinism spot-check (rebuild + rerun a sample of seeds in main process)');
  const SAMPLE = [1, 42, 250, 499, 500];
  let detOk = 0;
  for (const s of SAMPLE) {
    const a = new CodeForge(s), b = new CodeForge(s);
    const sameLang = JSON.stringify(a.keywords) === JSON.stringify(b.keywords) && a.assignOp === b.assignOp && a.blockStyle === b.blockStyle;
    // Cross-check vs the worker-produced language fingerprint too.
    const wr = results.find((r) => r.seed === s);
    const matchesWorker = wr && JSON.stringify(a.keywords) === JSON.stringify(wr.keywords) && a.assignOp === wr.assignOp && a.blockStyle === wr.blockStyle;
    const ra = a.run(a.examples().fizzbuzz, RUN_OPTS);
    const sameOut = ra.output.trim() === refFizz(15);
    if (sameLang && matchesWorker && sameOut) detOk++;
    else console.log(`    seed ${s}: MISMATCH (sameLang=${sameLang} matchesWorker=${matchesWorker} fizzOk=${sameOut})`);
  }
  console.log(`  deterministic: ${detOk}/${SAMPLE.length} sampled seeds reproduce identical language (main==worker) + correct fizzbuzz`);

  // ----- PART 6: identifier-safety (caveat surfaced by replication) -----
  // CodeForge guarantees its KEYWORDS are internally unique, but it does NOT
  // reserve them against a *user's* identifiers. If a program names a variable
  // or function with a token the language happens to mint as a keyword, that
  // token tokenizes as 'kw' and parsing fails (e.g. `func ad(...)` when `ad`
  // is a keyword). So "100% functional" is conditional on programs not reusing
  // generated keyword tokens as identifiers — which a spec-following caller does
  // for free (the spec lists every keyword). We verify the committed battery +
  // feature-probe identifiers are collision-free across the whole corpus, and
  // report how often a generated language reserves each name (i.e. how careful a
  // benchmark author must be).
  console.log('\n[PART 6] Identifier safety — do the harness identifiers ever collide with a language keyword?');
  const HARNESS_IDS = ['total', 'i', 'c', 'n', 'x', 'z', 'fac', 'fib', 'add', 'sq', 'f', 'a', 'b'];
  const idCollisionSeeds = [];
  const idReservedCount = Object.fromEntries(HARNESS_IDS.map((id) => [id, 0]));
  for (const r of results) {
    const kwSet = new Set(Object.values(r.keywords).concat(r.blockStyle === 'word' ? [r.blockOpen, r.blockClose] : []));
    const bad = HARNESS_IDS.filter((id) => kwSet.has(id));
    for (const id of bad) idReservedCount[id]++;
    if (bad.length) idCollisionSeeds.push({ seed: r.seed, bad });
  }
  console.log(`  harness identifiers colliding with a keyword: ${idCollisionSeeds.length}/${N_SEEDS} languages`);
  if (idCollisionSeeds.length) {
    for (const c of idCollisionSeeds.slice(0, 20)) console.log(`    seed ${c.seed}: ${c.bad.join(',')}`);
    console.log('  (these would NOT be true generator defects — they are name clashes a spec-following caller avoids)');
  } else {
    console.log('  none — every harness identifier is free of the generated keyword namespace across the corpus,');
    console.log('  confirming the 100% functional result is not a naming-luck artifact for this battery.');
  }
  // How reserved is the identifier namespace generally? Probe a wide pool of
  // common short identifiers; report worst offenders so authors know the risk.
  const COMMON_IDS = ['a','b','c','d','e','f','g','h','i','j','k','n','m','x','y','z','sum','val','num','tmp','res','add','sub','mul','div','fn','fac','fib','sq','it','at','to','do','go','ad','id'];
  const reservedFreq = {};
  for (const r of results) {
    const kwSet = new Set(Object.values(r.keywords).concat(r.blockStyle === 'word' ? [r.blockOpen, r.blockClose] : []));
    for (const id of COMMON_IDS) if (kwSet.has(id)) reservedFreq[id] = (reservedFreq[id] || 0) + 1;
  }
  const offenders = Object.entries(reservedFreq).sort((a, b) => b[1] - a[1]).slice(0, 10);
  if (offenders.length) {
    console.log('  most-frequently-reserved common identifiers (risk for naive authors):');
    console.log('    ' + offenders.map(([id, c]) => `${id}:${c}/${N_SEEDS}`).join('  '));
  } else {
    console.log('  none of a broad common-identifier pool was ever reserved across the corpus.');
  }

  // ----- HEADLINE -----
  console.log('\n========================================================');
  console.log('  HEADLINE');
  console.log('========================================================');
  console.log(`  ${fullyFunctional}/${N_SEEDS} generated languages fully functional, ${degen.length} degenerate, keyword overlap ${(meanOverlap * 100).toFixed(2)}%`);
  console.log(`  (max pairwise overlap ${(overlapMax * 100).toFixed(2)}%, ${sigs.size}/${N_SEEDS} unique vocabularies, all ${Object.keys(FEATURE_PROBES).length} benchmark features ${allFeaturesUniversal ? 'UNIVERSAL' : 'NOT universal'})`);
  const verdict = fullyFunctional === N_SEEDS && degen.length === 0 && allFeaturesUniversal
    ? 'SUPPORTS'
    : (fullyFunctional / N_SEEDS >= 0.95 && degen.length / N_SEEDS <= 0.05) ? 'PARTIALLY SUPPORTS' : 'FAILS';
  console.log(`  VERDICT: thesis ${verdict} — the coding affordance ${verdict === 'FAILS' ? 'does NOT' : 'reliably'} exists.`);
  console.log('========================================================');
  process.exit(0);
}
