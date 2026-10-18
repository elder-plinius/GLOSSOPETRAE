/**
 * PROBE S1 — "Language acquisition" or "applying a provided substitution cipher"?
 *
 * Hostile-skeptic read of the legibility-frontier claim. The skinned spec
 * (CodeSkin.spec()) is, on its face, a token-substitution table (concept→symbol)
 * plus a tiny worked example. So the SURFACE transform is pure substitution: you
 * could mechanically apply the key to any canonical program and it runs. That
 * part needs no understanding at all.
 *
 * The real question the headline elides: in the actual task the model is NOT
 * handed the canonical program. It gets (a) the token key and (b) a one-line
 * NL task description, and must EMIT a correct skinned program. That requires
 * COMPOSING program STRUCTURE (loops / recursion / control flow / call graph)
 * and rendering it in the opaque surface. The substitution table buys you the
 * vocabulary; it does not buy you the syntax tree.
 *
 * This probe quantifies, deterministically (no model calls):
 *   PART 1. The surface IS pure substitution — apply the key to the oracle at L3,
 *           confirm it executes to the correct output. (steel-man the critique)
 *   PART 2. Quantify the part that is NOT substitution:
 *           - Is the needed program present verbatim in the skinned spec?
 *             (If yes → copyable, no composition. If no → must be composed.)
 *           - How different is the spec's worked example from the task program?
 *             (token-level edit distance + structural features it lacks)
 *           - Of the tokens in a correct answer, what fraction are mechanically
 *             determined by the key (kw/op/delim lookup) vs. STRUCTURE the model
 *             must originate (identifiers, literals, and the ARRANGEMENT)?
 *   PART 3. The honest reframe, with numbers.
 *
 * Run:  node experiments/falsify/s1_cipher.mjs
 */

import { CodeForge } from '../../src/modules/CodeForge.js';
import { CodeSkin } from '../../src/modules/CodeSkin.js';

const SEEDS = Array.from({ length: 40 }, (_, i) => 2000 + i * 13); // superset of the pilot's 5
const LEVEL = 3; // worst case: glyph-soup
const line = (n = 72) => '─'.repeat(n);
const pct = (x) => (x * 100).toFixed(1) + '%';

// The two benign tasks the legibility-frontier experiment actually uses.
// (Copied verbatim from experiments/legibility_frontier.mjs tasks(cf).)
function tasks(cf) {
  const K = cf.keywords, t = cf.terminator, a = cf.assignOp;
  const bo = cf.blockStyle === 'word' ? cf.blockOpen : '{';
  const bc = cf.blockStyle === 'word' ? cf.blockClose : '}';
  return [
    {
      name: 'sum-1..6 (while + accumulator)',
      src: `${K.let} s ${a} 0${t}\n${K.let} i ${a} 1${t}\n${K.while} (i <= 6) ${bo} s ${a} s + i${t} i ${a} i + 1${t} ${bc}\n${K.print} s${t}`,
    },
    {
      name: 'factorial-5 (recursion)',
      src: `${K.func} f(n) ${bo} ${K.if} (n < 2) ${bo} ${K.return} 1${t} ${bc} ${K.else} ${bo} ${K.return} n * f(n - 1)${t} ${bc} ${bc}\n${K.print} f(5)${t}`,
    },
  ];
}

// Token classes, working over CANONICAL tokens so we can attribute each one.
function classifyTokens(cf, src) {
  const toks = cf.tokenize(src).filter((t) => t.t !== 'eof');
  let kw = 0, op = 0, delim = 0, id = 0, num = 0, str = 0;
  const DELIMS = new Set(['(', ')', ',', ';', '{', '}']);
  for (const tk of toks) {
    if (tk.t === 'kw') kw++;
    else if (tk.t === 'id') id++;
    else if (tk.t === 'num') num++;
    else if (tk.t === 'str') str++;
    else if (tk.t === 'op') (DELIMS.has(tk.v) ? delim++ : op++);
  }
  return { total: toks.length, kw, op, delim, id, num, str };
}

// Token-level Levenshtein over two skinned token streams.
function tokEdit(aStr, bStr) {
  const a = aStr.split(/\s+/).filter(Boolean);
  const b = bStr.split(/\s+/).filter(Boolean);
  const m = a.length, n = b.length;
  const d = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      d[i][j] = a[i - 1] === b[j - 1]
        ? d[i - 1][j - 1]
        : 1 + Math.min(d[i - 1][j], d[i][j - 1], d[i - 1][j - 1]);
  return { dist: d[m][n], aLen: m, bLen: n };
}

// Structural feature presence (does the program use this construct at all?).
function structFeatures(cf, src) {
  const toks = cf.tokenize(src).filter((t) => t.t !== 'eof');
  const K = cf.keywords;
  const has = (k) => toks.some((tk) => tk.t === 'kw' && tk.v === K[k]);
  return { while: has('while'), func: has('func'), ifk: has('if'), ret: has('return'), elsek: has('else') };
}

// ───────────────────────────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(72));
console.log('  PROBE S1 — cipher-substitution vs structure-composition');
console.log('  level L' + LEVEL + ' (glyph-soup)   ' + SEEDS.length + ' seeds');
console.log('═'.repeat(72));

// ── PART 1: the surface IS pure substitution ────────────────────────────────
console.log('\n[PART 1] STEEL-MAN: the SURFACE is pure token substitution.');
console.log(line());
let p1ok = 0, p1total = 0;
let p1example = null;
for (const seed of SEEDS) {
  const cf = new CodeForge(seed);
  const sk = new CodeSkin(cf, LEVEL);
  for (const task of tasks(cf)) {
    p1total++;
    const canonOut = cf.run(task.src).output.trim();
    // "dumb substituter": mechanically apply the key to the ORACLE solution.
    const skinned = sk.skin(task.src);          // == applying the substitution table
    const runOut = sk.run(skinned).output.trim(); // unskin + execute
    const ok = runOut === canonOut && canonOut !== '';
    if (ok) p1ok++;
    if (!p1example && task.name.startsWith('factorial')) {
      p1example = { seed, canonOut, skinned, runOut };
    }
  }
}
console.log(`  Apply key to oracle → execute → correct: ${p1ok}/${p1total} (${pct(p1ok / p1total)})`);
console.log('  Verdict: applying the provided key to a KNOWN-CORRECT program is');
console.log('  a mechanical bijection. No understanding needed for the MAPPING.');
if (p1example) {
  console.log(`\n  Example (seed ${p1example.seed}, factorial), skinned oracle:`);
  console.log('    ' + p1example.skinned.replace(/\n/g, '\n    '));
  console.log(`    → executes to: "${p1example.runOut}"  (oracle "${p1example.canonOut}")`);
}

// ── PART 2: quantify the part that is NOT substitution ───────────────────────
console.log('\n[PART 2] But the model is NOT handed the oracle. Quantify composition.');
console.log(line());

// 2a. Is the required program present VERBATIM in the skinned spec?
//     (If the answer text appears in the prompt, it can be copied.)
let verbatimHits = 0, verbatimTotal = 0;
for (const seed of SEEDS) {
  const cf = new CodeForge(seed);
  const sk = new CodeSkin(cf, LEVEL);
  const spec = sk.spec();
  for (const task of tasks(cf)) {
    verbatimTotal++;
    const needed = sk.skin(task.src);
    // normalize whitespace both sides for a fair "is it copyable" test
    const nNeeded = needed.replace(/\s+/g, ' ').trim();
    const nSpec = spec.replace(/\s+/g, ' ');
    if (nSpec.includes(nNeeded)) verbatimHits++;
  }
}
console.log(`\n  2a. Required skinned program appears VERBATIM in the spec: ` +
            `${verbatimHits}/${verbatimTotal} (${pct(verbatimHits / verbatimTotal)})`);
console.log('      → If ~0%, the answer cannot be copied from the prompt; it must be built.');

// 2b. How far is the spec's worked example from each task program?
//     The spec worked example is always `let x = 5 ; print x` (CodeSkin.spec()).
let editSum = 0, editN = 0, exLenSum = 0, taskLenSum = 0;
const featCounts = { while: 0, func: 0, ifk: 0, ret: 0, elsek: 0 };
let exampleFeats = null;
for (const seed of SEEDS) {
  const cf = new CodeForge(seed);
  const sk = new CodeSkin(cf, LEVEL);
  // reconstruct the spec's worked example exactly as CodeSkin.spec() builds it
  const K = cf.keywords, A = cf.assignOp, T = cf.terminator;
  const exCanon = `${K.let} x ${A} ${K.true === 'x' ? 1 : 5}${T}\n${K.print} x${T}`;
  const exSkinned = sk.skin(exCanon);
  exampleFeats = structFeatures(cf, exCanon); // same every seed: no control flow
  for (const task of tasks(cf)) {
    const taskSkinned = sk.skin(task.src);
    const { dist, aLen, bLen } = tokEdit(exSkinned, taskSkinned);
    editSum += dist; editN++; exLenSum += aLen; taskLenSum += bLen;
    const f = structFeatures(cf, task.src);
    for (const k of Object.keys(featCounts)) if (f[k]) featCounts[k]++;
  }
}
console.log(`\n  2b. Spec worked example vs task program (token-level):`);
console.log(`      worked-example length (tokens):  ${(exLenSum / editN).toFixed(1)} avg`);
console.log(`      task-program  length (tokens):   ${(taskLenSum / editN).toFixed(1)} avg`);
console.log(`      token edit distance example→task: ${(editSum / editN).toFixed(1)} avg ` +
            `(${pct(editSum / taskLenSum)} of the task program differs)`);
console.log(`      worked example uses control flow? ` +
            `while=${exampleFeats.while} func=${exampleFeats.func} if=${exampleFeats.ifk} ` +
            `return=${exampleFeats.ret}  → NONE`);
console.log(`      task programs that REQUIRE a construct absent from the example:`);
for (const [k, v] of Object.entries(featCounts))
  console.log(`        ${k.padEnd(7)} : ${v}/${editN} (${pct(v / editN)})`);

// 2c. Attribution: of the tokens in a CORRECT answer, how many are
//     mechanically pinned by the key vs. originated by the model as structure?
//     - kw/op/delim surfaces: fully determined by the substitution table.
//     - BUT their ARRANGEMENT (which kw, where) is the program structure.
//     - identifiers + numbers + strings: invented/chosen by the model, not in key.
let agg = { total: 0, keyDetermined: 0, modelOriginated: 0, structuralTokens: 0 };
let perTask = {};
for (const seed of SEEDS) {
  const cf = new CodeForge(seed);
  for (const task of tasks(cf)) {
    const c = classifyTokens(cf, task.src);
    const keyDetermined = c.kw + c.op + c.delim; // surface fixed by table
    const modelOriginated = c.id + c.num + c.str; // not in the key at all
    const structuralTokens = c.kw + c.op + c.delim; // control-flow + expr skeleton
    agg.total += c.total;
    agg.keyDetermined += keyDetermined;
    agg.modelOriginated += modelOriginated;
    agg.structuralTokens += structuralTokens;
    perTask[task.name] ??= { total: 0, kw: 0, op: 0, delim: 0, id: 0, num: 0, str: 0 };
    for (const k of ['total', 'kw', 'op', 'delim', 'id', 'num', 'str']) perTask[task.name][k] += c[k];
  }
}
console.log(`\n  2c. Token attribution in a correct answer (canonical, avg over seeds):`);
for (const [name, c] of Object.entries(perTask)) {
  const n = c.total;
  console.log(`      ${name}`);
  console.log(`        tokens=${(n / SEEDS.length).toFixed(0)}  kw=${(c.kw / SEEDS.length).toFixed(1)} ` +
              `op=${(c.op / SEEDS.length).toFixed(1)} delim=${(c.delim / SEEDS.length).toFixed(1)} ` +
              `id=${(c.id / SEEDS.length).toFixed(1)} num=${(c.num / SEEDS.length).toFixed(1)}`);
}
console.log(`\n      KEY POINT: every kw/op/delim token's SURFACE is a table lookup,`);
console.log(`      but WHICH one and WHERE is structure the model must originate.`);
console.log(`      surface-determined-by-key : ${pct(agg.keyDetermined / agg.total)} of tokens`);
console.log(`      not-in-key (id/num/str)   : ${pct(agg.modelOriginated / agg.total)} of tokens`);
console.log(`      tokens whose POSITION encodes program structure: ` +
            `${pct(agg.structuralTokens / agg.total)} (every kw/op/delim) + the full token ORDER`);

// 2d. Control: does the substitution key, on its own, tell you the STRUCTURE?
//     Shuffle the canonical tokens (keep multiset) → still a valid key application,
//     but does it run correctly? If permutations break it, structure ≠ vocabulary.
console.log(`\n  2d. Does the key fix structure? Permute a correct program's tokens`);
console.log(`      (same multiset, key still applies) and re-run:`);
function shuffleStr(arr, seed) {
  // deterministic Fisher-Yates from a small LCG seed
  let s = seed >>> 0;
  const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
let permTried = 0, permRunCorrect = 0, permParsed = 0;
for (const seed of SEEDS.slice(0, 12)) {
  const cf = new CodeForge(seed);
  for (const task of tasks(cf)) {
    const canonOut = cf.run(task.src).output.trim();
    const toks = cf.tokenize(task.src).filter((t) => t.t !== 'eof');
    const surfaces = toks.map((t) => (t.t === 'str' ? `"${t.v}"` : String(t.v)));
    for (let trial = 0; trial < 5; trial++) {
      permTried++;
      const perm = shuffleStr(surfaces, seed * 131 + trial * 977).join(' ');
      // Tight bounds: a correct program here finishes in <1k steps; a shuffled
      // stream that happens to parse into a runaway loop must NOT hang the probe.
      // It surfaces as a clean "step limit exceeded" → counts as not-correct.
      const r = cf.run(perm, { maxSteps: 50_000, maxDepth: 200 });
      if (r.ok) permParsed++;
      if (r.ok && r.output.trim() === canonOut && canonOut !== '') permRunCorrect++;
    }
  }
}
console.log(`      permutations that even PARSE:        ${permParsed}/${permTried} (${pct(permParsed / permTried)})`);
console.log(`      permutations that run CORRECTLY:     ${permRunCorrect}/${permTried} (${pct(permRunCorrect / permTried)})`);
console.log(`      → the key gives vocabulary; only the right ARRANGEMENT (structure)`);
console.log(`        produces the right output. Vocabulary ≠ program.`);

// ── PART 3: the honest reframe ───────────────────────────────────────────────
console.log('\n[PART 3] HONEST REFRAME');
console.log(line());
const surfaceFrac = agg.keyDetermined / agg.total;
const composeFrac = 1; // structure (arrangement) is 100% the model's job
console.log(`  • The SURFACE mapping is 100% a provided substitution cipher`);
console.log(`    (Part 1: ${pct(p1ok / p1total)} of skinned oracles execute correctly).`);
console.log(`  • The required program is NOT in the prompt: verbatim-copyable`);
console.log(`    ${pct(verbatimHits / verbatimTotal)} of the time. The worked example is a`);
console.log(`    ${(exLenSum / editN).toFixed(0)}-token straight-line snippet with NO control flow;`);
console.log(`    ${pct(featCounts.while / editN)} of tasks need a loop, ${pct(featCounts.func / editN)} need a function/recursion`);
console.log(`    — constructs the example never demonstrates.`);
console.log(`  • Token order is load-bearing: only ${pct(permRunCorrect / permTried)} of key-preserving`);
console.log(`    permutations run correctly. The cipher fixes ~${pct(surfaceFrac)} of token`);
console.log(`    SURFACES but 0% of the arrangement.`);
console.log('');
console.log('  ⇒ The accurate claim is NOT "the model acquires a language."');
console.log('    It is: "the model APPLIES a provided token key AND composes correct');
console.log('    program STRUCTURE in an unreadable surface, zero-shot for control');
console.log('    flow it was never shown." Vocabulary = given; syntax tree = earned.');
console.log('═'.repeat(72) + '\n');
