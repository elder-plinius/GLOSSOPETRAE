/**
 * PROBE S2 — Is the L3 surface ACTUALLY uncrackable without the key?
 *
 * Hostile-skeptic cryptanalysis of L3-skinned CodeForge programs with NO access
 * to CodeSkin.fwd/rev/spec. We see ONLY the opaque token stream. We attempt to
 * recover token meanings (which glyph means ';', '(', 'let', 'while', '==', etc.)
 * using frequency analysis + positional/structural heuristics that any analyst
 * (human or LLM) could apply.
 *
 * THE CLAIM: "humans/cold-readers can't read L3 (glyph-soup); it's invisible by
 * construction." We attack: structure is PRESERVED (token order, grammar) and
 * identifiers/numbers/strings PASS THROUGH AS ASCII. That leaks a lot.
 *
 * Outputs MEASURED numbers:
 *   (1) Single-program crack rate: across N seeds, with a small per-language
 *       corpus, how often do we recover >=2 token meanings correctly?
 *   (2) Corpus-size scaling: does crackability rise with more ciphertext (same
 *       language / same seed)?
 *   (3) Per-token recovery rates -> which tokens are robust vs which leak.
 *
 * Determinism only. No model API calls.
 */

import { CodeForge } from '../../src/modules/CodeForge.js';
import { CodeSkin } from '../../src/modules/CodeSkin.js';

const L = 3;

// CodeForge construction generates an entire natural language (~2s/seed), so we
// forge each seed exactly once and reuse the cf/sk across all experiments.
const _forgeCache = new Map();
function forge(seed) {
  let e = _forgeCache.get(seed);
  if (!e) { const cf = new CodeForge(seed); e = { cf, sk: new CodeSkin(cf, L) }; _forgeCache.set(seed, e); }
  return e;
}

// ---------------------------------------------------------------------------
// Program generators (canonical CodeForge source for a given language `cf`).
// We use a varied corpus so frequency stats are meaningful, like a real codebase.
// ---------------------------------------------------------------------------
function progs(cf) {
  const K = cf.keywords, a = cf.assignOp, t = cf.terminator;
  const bo = cf.blockStyle === 'word' ? cf.blockOpen : '{';
  const bc = cf.blockStyle === 'word' ? cf.blockClose : '}';
  const P = [];
  // FizzBuzz + factorial + the canonical examples
  const ex = cf.examples();
  P.push(ex.fizzbuzz, ex.factorial, ex.countUp, ex.hello);
  // counting loops of varying bounds
  for (const [n, step] of [[10, 1], [7, 2], [20, 3]]) {
    P.push(
      `${K.let} i ${a} 0${t}\n${K.while} (i < ${n}) ${bo}\n  ${K.print} i${t}\n  i ${a} i + ${step}${t}\n${bc}`
    );
  }
  // sum / accumulate
  P.push(
    `${K.let} s ${a} 0${t}\n${K.let} i ${a} 1${t}\n${K.while} (i <= 10) ${bo}\n` +
    `  ${K.if} (i % 2 == 0) ${bo} s ${a} s + i${t} ${bc} ${K.else} ${bo} s ${a} s - i${t} ${bc}\n` +
    `  i ${a} i + 1${t}\n${bc}\n${K.print} s${t}`
  );
  // recursive fib
  P.push(
    `${K.func} fib(n) ${bo}\n  ${K.if} (n <= 1) ${bo} ${K.return} n${t} ${bc}\n` +
    `  ${K.return} fib(n - 1) + fib(n - 2)${t}\n${bc}\n${K.print} fib(10)${t}`
  );
  // boolean logic + comparisons
  P.push(
    `${K.let} x ${a} 5${t}\n${K.let} y ${a} 8${t}\n` +
    `${K.if} (x < y ${K.and} y > 0) ${bo} ${K.print} ${K.true}${t} ${bc} ${K.else} ${bo} ${K.print} ${K.false}${t} ${bc}\n` +
    `${K.if} (${K.not} (x == y) ${K.or} x != x) ${bo} ${K.print} "diff"${t} ${bc}`
  );
  // nested function + multiple calls
  P.push(
    `${K.func} add(a, b) ${bo} ${K.return} a + b${t} ${bc}\n` +
    `${K.func} mul(a, b) ${bo} ${K.return} a * b${t} ${bc}\n` +
    `${K.print} add(2, 3)${t}\n${K.print} mul(4, 5)${t}\n${K.print} add(mul(2, 3), 4)${t}`
  );
  // gcd
  P.push(
    `${K.func} gcd(a, b) ${bo}\n  ${K.while} (b != 0) ${bo}\n    ${K.let} tmp ${a} b${t}\n` +
    `    b ${a} a % b${t}\n    a ${a} tmp${t}\n  ${bc}\n  ${K.return} a${t}\n${bc}\n${K.print} gcd(48, 36)${t}`
  );
  return P;
}

// What we are TRYING to recover. The ground-truth canonical->concept labels.
function truthMap(cf) {
  const K = cf.keywords;
  const m = new Map();
  m.set(K.let, 'let'); m.set(K.if, 'if'); m.set(K.else, 'else'); m.set(K.while, 'while');
  m.set(K.func, 'func'); m.set(K.return, 'return'); m.set(K.print, 'print');
  m.set(K.true, 'true'); m.set(K.false, 'false'); m.set(K.and, 'and'); m.set(K.or, 'or');
  m.set(K.not, 'not'); m.set(K.null, 'null');
  m.set(cf.assignOp, 'assign'); m.set(cf.terminator, ';');
  m.set('(', '('); m.set(')', ')'); m.set(',', ','); m.set('+', '+'); m.set('-', '-');
  m.set('*', '*'); m.set('/', '/'); m.set('%', '%'); m.set('<', '<'); m.set('>', '>');
  m.set('<=', '<='); m.set('>=', '>='); m.set('==', '=='); m.set('!=', '!=');
  if (cf.blockStyle === 'word') { m.set(cf.blockOpen, '{'); m.set(cf.blockClose, '}'); }
  else { m.set('{', '{'); m.set('}', '}'); }
  return m;
}

// Build a glyph -> true-concept map by composing the skin's reverse map with truth.
// (Used ONLY for SCORING our guesses, never for the attack.)
function glyphTruth(cf, sk) {
  const truth = truthMap(cf);
  const out = new Map();
  for (const [canon, concept] of truth) {
    const glyph = sk.fwd.get(canon) ?? canon;
    out.set(glyph, concept);
  }
  return out;
}

// ---------------------------------------------------------------------------
// THE ATTACK — operates ONLY on the array of opaque (skinned) program strings.
// No access to sk.fwd/rev/spec. Returns Map<glyph, guessedConcept>.
// ---------------------------------------------------------------------------
function attack(opaquePrograms) {
  // tokenize the opaque surface: it is space-delimited. Numbers, identifiers and
  // "strings" pass through as ASCII; everything else (keywords/ops/delims) is a
  // single glyph at L3. We treat any token whose first codepoint is non-ASCII as
  // a glyph (numbers/identifiers/"strings" are ASCII and pass through). This is
  // exactly what a cold analyst sees: ASCII tokens are footholds, glyphs are the
  // unknown alphabet.
  const isGlyph = (tok) => tok.length > 0 && tok.codePointAt(0) >= 128;
  const isAsciiWord = (tok) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(tok);
  const isNumber = (tok) => /^[0-9]+(\.[0-9]+)?$/.test(tok);
  const isString = (tok) => tok.startsWith('"');

  const lines = [];          // array of token arrays
  const freq = new Map();    // glyph -> count
  const bump = (m, k, by = 1) => m.set(k, (m.get(k) || 0) + by);

  for (const prog of opaquePrograms) {
    for (const rawLine of prog.split('\n')) {
      const toks = rawLine.split(/\s+/).filter(Boolean);
      if (!toks.length) continue;
      lines.push(toks);
      for (const tk of toks) if (isGlyph(tk)) bump(freq, tk);
    }
  }

  // Flatten a global token stream too (for adjacency), with line boundaries kept.
  const allToks = [];
  for (const toks of lines) { for (const tk of toks) allToks.push(tk); allToks.push('\n'); }

  const guesses = new Map();   // glyph -> concept
  const claim = (glyph, concept) => { if (glyph && !guesses.has(glyph)) guesses.set(glyph, concept); };

  const glyphsByFreq = [...freq.entries()].sort((a, b) => b[1] - a[1]).map(([g]) => g);

  // --- Heuristic A: statement terminator ';' is the single most frequent glyph.
  // In imperative code, nearly every statement ends with ';'. Strong signal.
  // Refinement: ';' very often appears as the LAST glyph on a line.
  const lineEndCount = new Map();
  for (const toks of lines) {
    const last = toks[toks.length - 1];
    if (isGlyph(last)) bump(lineEndCount, last);
  }
  // Score each glyph: frequency * (fraction of its occurrences that are line-final-ish)
  // Combine raw freq with line-end propensity.
  const termScore = new Map();
  for (const g of freq.keys()) {
    const f = freq.get(g);
    const le = lineEndCount.get(g) || 0;
    termScore.set(g, f + le * 2);
  }
  const termGlyph = [...termScore.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  claim(termGlyph, ';');

  // --- Heuristic B: '(' and ')' — they always come in balanced pairs and bracket
  // expressions. Find the two glyphs that most often appear as a balanced pair on
  // a line with stuff between them. Distinguish open vs close by: open is followed
  // by content, close is preceded by content; open never ends a line, close often
  // precedes a block-open glyph.
  // Detect bracket-like glyphs via per-line balance: a pair (o,c) such that on most
  // lines count(o)==count(c) and o appears before c.
  const pairScore = new Map(); // "o|c" -> score
  for (const toks of lines) {
    const gtoks = toks.filter(isGlyph);
    const counts = new Map();
    for (const g of gtoks) bump(counts, g);
    for (const [o, oc] of counts) for (const [c, cc] of counts) {
      if (o === c) continue;
      if (oc === cc) {
        // check first index of o < first index of c
        const io = gtoks.indexOf(o), ic = gtoks.indexOf(c);
        if (io >= 0 && ic >= 0 && io < ic) bump(pairScore, o + ' ' + c, oc);
      }
    }
  }
  const bestPair = [...pairScore.entries()].sort((a, b) => b[1] - a[1])[0];
  let openGlyph, closeGlyph;
  if (bestPair) {
    [openGlyph, closeGlyph] = bestPair[0].split(' ');
  }

  // --- Heuristic C: keyword that STARTS the most lines after indentation is a
  // strong "let/print/if/while" candidate. The single glyph that most often is
  // the FIRST token of a line is a statement-leading keyword. The MOST common
  // line-leader in mixed code tends to be the assignment/declaration or print.
  const lineStart = new Map();
  for (const toks of lines) {
    const first = toks[0];
    if (isGlyph(first)) bump(lineStart, first);
  }

  // --- Heuristic D: glyph immediately followed by '(' that itself starts a line
  // is `if` or `while` (control headers: `<kw> ( cond )`). Among line-leading
  // glyphs that are immediately followed by openGlyph, the most frequent is a
  // control keyword. We can't split if vs while without more, so we label the
  // category "control-header(if/while)" and count a hit if truth is if OR while.
  if (openGlyph) {
    const headerCount = new Map();
    for (const toks of lines) {
      for (let i = 0; i < toks.length - 1; i++) {
        if (isGlyph(toks[i]) && toks[i + 1] === openGlyph) {
          // is it line-leading-ish (start of statement)? require preceding token
          // is a glyph block-open/terminator or it's the first token.
          if (i === 0) bump(headerCount, toks[i]);
        }
      }
    }
    // The two most frequent header glyphs are {if, while}. Assign both as control.
    const hdr = [...headerCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([g]) => g);
    for (const g of hdr) claim(g, 'control-if-or-while');
  }

  // --- Heuristic E: assignment glyph. After a line-leading keyword (let) and an
  // identifier, the next glyph is the assignment op. Pattern: <glyph> <id> <glyph2> ...
  // glyph2 is the assignment. Also bare `id <glyph> expr` reassignment.
  const assignCount = new Map();
  for (const toks of lines) {
    for (let i = 0; i < toks.length - 1; i++) {
      if (isAsciiWord(toks[i]) && isGlyph(toks[i + 1])) {
        // id followed by a glyph that is NOT the open-paren (would be a call) and
        // NOT the terminator. Candidate assignment.
        const g = toks[i + 1];
        if (g !== openGlyph && g !== termGlyph) bump(assignCount, g);
      }
    }
  }
  // The assignment glyph dominates "id <glyph>" where glyph is followed by a value.
  // Refine: require the token AFTER the glyph to be a number/id/glyph(unary)/string.
  const assignCount2 = new Map();
  for (const toks of lines) {
    for (let i = 0; i + 2 < toks.length; i++) {
      if (isAsciiWord(toks[i]) && isGlyph(toks[i + 1])) {
        const g = toks[i + 1], after = toks[i + 2];
        if (g === openGlyph || g === termGlyph) continue;
        if (isNumber(after) || isAsciiWord(after) || isString(after) || isGlyph(after)) bump(assignCount2, g);
      }
    }
  }
  const assignGlyph = [...assignCount2.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  // Only claim if it's clearly distinct from paren/term and reasonably frequent.
  if (assignGlyph) claim(assignGlyph, 'assign');

  // --- Heuristic F: block braces '{' and '}'. The block-open glyph frequently
  // follows the close-paren of a control header `) {`, and block-close often
  // precedes a line-leading control glyph (else) or ends a block. Find glyph that
  // most often immediately follows closeGlyph.
  if (closeGlyph) {
    const afterClose = new Map();
    for (const toks of lines) {
      for (let i = 0; i < toks.length - 1; i++) {
        if (toks[i] === closeGlyph && isGlyph(toks[i + 1]) && toks[i + 1] !== termGlyph) bump(afterClose, toks[i + 1]);
      }
    }
    const blockOpenGlyph = [...afterClose.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    if (blockOpenGlyph) claim(blockOpenGlyph, 'block-open');
  }

  // Finalize paren claims AFTER the others so we don't double-assign open/close to
  // something already taken; parens are high-confidence from balance.
  // Re-pick best pair excluding glyphs already claimed as something structural we
  // trust more (terminator). If openGlyph got claimed as control by accident, the
  // balance signal is still the parens — prefer it.
  if (openGlyph && openGlyph !== termGlyph) { guesses.delete(openGlyph); claim(openGlyph, '('); }
  if (closeGlyph && closeGlyph !== termGlyph) { guesses.delete(closeGlyph); claim(closeGlyph, ')'); }

  return { guesses, freq, glyphsByFreq, nGlyphTokens: allToks.filter(isGlyph).length };
}

// Score: a recovered token is "correct" if our guessed concept matches truth.
// For the control-header category, count correct if truth is if OR while.
function scoreGuesses(guesses, gt) {
  let correct = 0;
  const detail = [];
  for (const [glyph, guess] of guesses) {
    const truth = gt.get(glyph);
    let ok;
    if (guess === 'control-if-or-while') ok = (truth === 'if' || truth === 'while');
    else if (guess === 'block-open') ok = (truth === '{');
    else ok = (truth === guess);
    if (ok) correct++;
    detail.push({ glyph, guess, truth, ok });
  }
  return { correct, total: guesses.size, detail };
}

// ---------------------------------------------------------------------------
// EXPERIMENT 1 — single-language crack rate across many seeds.
// ---------------------------------------------------------------------------
function exp1(seeds) {
  let recoveredGE2 = 0, recoveredGE3 = 0, recoveredGE4 = 0;
  let totalCorrect = 0, totalGuesses = 0;
  const perConcept = new Map();   // concept -> {tries, hits}
  const tally = (concept, hit) => {
    const r = perConcept.get(concept) || { tries: 0, hits: 0 };
    r.tries++; if (hit) r.hits++; perConcept.set(concept, r);
  };
  for (const seed of seeds) {
    const { cf, sk } = forge(seed);
    const canon = progs(cf);
    const opaque = canon.map((p) => sk.skin(p));
    const gt = glyphTruth(cf, sk);
    const { guesses } = attack(opaque);
    const { correct, detail } = scoreGuesses(guesses, gt);
    if (correct >= 2) recoveredGE2++;
    if (correct >= 3) recoveredGE3++;
    if (correct >= 4) recoveredGE4++;
    totalCorrect += correct; totalGuesses += guesses.size;
    for (const d of detail) tally(d.guess, d.ok);
  }
  const n = seeds.length;
  return {
    n,
    rateGE2: recoveredGE2 / n,
    rateGE3: recoveredGE3 / n,
    rateGE4: recoveredGE4 / n,
    precision: totalGuesses ? totalCorrect / totalGuesses : 0,
    avgGuesses: totalGuesses / n,
    avgCorrect: totalCorrect / n,
    perConcept,
  };
}

// ---------------------------------------------------------------------------
// EXPERIMENT 2 — corpus-size scaling: does more ciphertext (same seed) help?
// ---------------------------------------------------------------------------
function exp2(seeds, sizes) {
  const rows = [];
  for (const size of sizes) {
    let recoveredGE2 = 0, totalCorrect = 0;
    const conceptHits = new Map();   // concept -> #seeds where correctly recovered
    for (const seed of seeds) {
      const { cf, sk } = forge(seed);
      const all = progs(cf);
      const subset = all.slice(0, Math.min(size, all.length));
      const opaque = subset.map((p) => sk.skin(p));
      const gt = glyphTruth(cf, sk);
      const { correct, detail } = scoreGuesses(attack(opaque).guesses, gt);
      if (correct >= 2) recoveredGE2++;
      totalCorrect += correct;
      for (const d of detail) if (d.ok) conceptHits.set(d.guess, (conceptHits.get(d.guess) || 0) + 1);
    }
    rows.push({
      size,
      rateGE2: recoveredGE2 / seeds.length,
      avgCorrect: totalCorrect / seeds.length,
      conceptHits,
    });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------
const SEEDS = Array.from({ length: 40 }, (_, i) => 1000 + i * 7);

console.log('=== PROBE S2 — cryptanalysis of L3 without the key ===');
console.log(`(forging ${SEEDS.length} languages; ~2s each, cached & reused)\n`);

const r1 = exp1(SEEDS);
console.log(`EXP1 single-language crack (N=${r1.n} seeds, full corpus per seed):`);
console.log(`  recover >=2 tokens: ${(r1.rateGE2 * 100).toFixed(1)}%`);
console.log(`  recover >=3 tokens: ${(r1.rateGE3 * 100).toFixed(1)}%`);
console.log(`  recover >=4 tokens: ${(r1.rateGE4 * 100).toFixed(1)}%`);
console.log(`  guess precision (correct/total guessed): ${(r1.precision * 100).toFixed(1)}%`);
console.log(`  avg tokens guessed/seed: ${r1.avgGuesses.toFixed(2)}, avg correct/seed: ${r1.avgCorrect.toFixed(2)}\n`);

console.log('  per-concept recovery (hits/tries across seeds):');
for (const [concept, { tries, hits }] of [...r1.perConcept.entries()].sort((a, b) => b[1].tries - a[1].tries)) {
  console.log(`    ${concept.padEnd(22)} ${hits}/${tries}  (${((hits / tries) * 100).toFixed(0)}%)`);
}

console.log('\nEXP2 corpus-size scaling (does more ciphertext help?):');
const maxN = progs(forge(SEEDS[0]).cf).length;
const r2 = exp2(SEEDS, [1, 2, 3, 4, 5, 6, 8, maxN]);
console.log('  #progs | >=2 crack | avg#correct | which concepts recovered (seeds/N)');
for (const row of r2) {
  const ch = [...row.conceptHits.entries()].sort((a, b) => b[1] - a[1])
    .map(([c, n]) => `${c}:${n}`).join(' ') || '(none)';
  console.log(`  ${String(row.size).padStart(5)}  | ${(row.rateGE2 * 100).toFixed(0).padStart(7)}%  | ${row.avgCorrect.toFixed(2).padStart(9)}   | ${ch}`);
}

// Single illustrative dump for one seed: show what an analyst sees vs what they crack.
const demoSeed = SEEDS[0];
const { cf, sk } = forge(demoSeed);
const opaque = progs(cf).map((p) => sk.skin(p));
const gt = glyphTruth(cf, sk);
const { guesses } = attack(opaque);
const { detail } = scoreGuesses(guesses, gt);
console.log(`\nILLUSTRATIVE seed ${demoSeed} — opaque FizzBuzz head (what the analyst sees):`);
console.log('  ' + opaque[0].split('\n').slice(0, 3).join('\n  '));
console.log(`  legibility: ${JSON.stringify(sk.legibility(opaque[0]))}`);
console.log('  cracked map (glyph -> guess [truth] ok?):');
for (const d of detail) console.log(`    ${d.glyph}  -> ${String(d.guess).padEnd(22)} [truth: ${String(d.truth).padEnd(8)}] ${d.ok ? 'OK' : 'x'}`);
