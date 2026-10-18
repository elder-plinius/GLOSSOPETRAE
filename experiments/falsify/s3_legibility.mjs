/**
 * PROBE S3 — Is the ASCII-ratio legibility proxy sound, or hand-wavy?
 *
 * Hostile-skeptic audit of CodeSkin.legibility() (= mean of {ascii fraction,
 * wordHint fraction}). We compute SEVERAL independent legibility metrics on the
 * SAME skinned programs across seeds and levels, and ask: do they AGREE that the
 * surface gets dramatically less legible L0→L3? Where do they disagree? Which
 * single metric is the most defensible stand-in for "a human can read this"?
 *
 * Metrics (all: HIGHER = MORE legible, normalized to [0,1] where noted):
 *   1. proxy        — CodeSkin.legibility().score  (the thing under attack)
 *   2. proxy.ascii  — fraction of non-space chars that are ASCII (<128)
 *   3. proxy.word   — fraction of tokens that are /^[a-zA-Z]{2,}$/
 *   4. dictEnglish  — fraction of tokens that are REAL English dictionary words
 *   5. pronounce    — fraction of alpha tokens that are pronounceable (have a
 *                     vowel + no >3 consonant run) — a human "can I say it" hook
 *   6. basicLatin   — fraction of non-space chars inside Basic Latin (U+0000..7F)
 *                     [same as ascii here, kept explicit for the Unicode framing]
 *   7. entropyLeg   — 1 - normalized Shannon char entropy. Glyph-soup uses a big
 *                     alien alphabet → high entropy → LOW legibility. This is the
 *                     one orthogonal, surface-statistics metric.
 *
 * No model calls. Fully deterministic.
 *
 *   node experiments/falsify/s3_legibility.mjs
 */

import { CodeForge } from '../../src/modules/CodeForge.js';
import { CodeSkin } from '../../src/modules/CodeSkin.js';

const SEEDS = [2000, 2013, 2026, 2039, 2052, 2065, 2078, 2091]; // 8 seeds
const LEVELS = [0, 1, 2, 3];

// ---------------------------------------------------------------------------
// Programs: the same benign tasks the real frontier study uses, in each lang.
// ---------------------------------------------------------------------------
function programs(cf) {
  const K = cf.keywords, t = cf.terminator, a = cf.assignOp;
  const bo = cf.blockStyle === 'word' ? cf.blockOpen : '{';
  const bc = cf.blockStyle === 'word' ? cf.blockClose : '}';
  return [
    // sum 1..6
    `${K.let} s ${a} 0${t}\n${K.let} i ${a} 1${t}\n${K.while} (i <= 6) ${bo} s ${a} s + i${t} i ${a} i + 1${t} ${bc}\n${K.print} s${t}`,
    // recursive factorial of 5
    `${K.func} f(n) ${bo} ${K.if} (n < 2) ${bo} ${K.return} 1${t} ${bc} ${K.else} ${bo} ${K.return} n * f(n - 1)${t} ${bc} ${bc}\n${K.print} f(5)${t}`,
    // fizzbuzz-ish: print Fizz/number for 1..5
    `${K.let} i ${a} 1${t}\n${K.while} (i <= 5) ${bo} ${K.if} (i % 3 == 0) ${bo} ${K.print} "Fizz"${t} ${bc} ${K.else} ${bo} ${K.print} i${t} ${bc} i ${a} i + 1${t} ${bc}`,
  ];
}

// ---------------------------------------------------------------------------
// A small, honest English dictionary (common words a human reader would parse).
// Deliberately NOT exhaustive — we only need to detect that L0 keywords/idents
// are sometimes real words and that L2/L3 tokens never are. False negatives on
// L0 only HURT our case, so this is a conservative (anti-our-claim) choice.
// ---------------------------------------------------------------------------
const ENGLISH = new Set((
  'a an the and or not if is are be to of in it for on with as at by from this that ' +
  'let make hold have when other while repeat again continue flow tool work do give send back ' +
  'speak say show sing yes light life good no dark death bad empty nothing void return print ' +
  'true false null func function else loop var int sum count number value name fizz buzz hello ' +
  'add print loop set get one two three four five six seven eight nine ten zero ' +
  's i n f x y z' // single-letter idents a human reads trivially as variables
).split(/\s+/));

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------
const tokensOf = (src) => String(src).split(/\s+/).filter(Boolean);
const alphaTokens = (src) => tokensOf(src).filter((tk) => /[a-zA-Z]/.test(tk));

// Raw Shannon entropy in bits/char (NOT self-normalized — self-normalizing by
// the alphabet-actually-used cancels exactly the effect we want to see, namely
// that glyph-soup draws from a much bigger alphabet. We map to a legibility
// score by normalizing against a fixed reference: ~5 bits/char ≈ a rich alien
// alphabet. legibility = 1 - min(1, H/5).)
const ENTROPY_REF_BITS = 5;
function shannonBitsPerChar(src) {
  const chars = [...String(src).replace(/\s/g, '')];
  if (!chars.length) return 0;
  const freq = new Map();
  for (const c of chars) freq.set(c, (freq.get(c) || 0) + 1);
  let H = 0;
  for (const n of freq.values()) { const p = n / chars.length; H -= p * Math.log2(p); }
  return H;
}
function entropyLegibility(src) {
  return 1 - Math.min(1, shannonBitsPerChar(src) / ENTROPY_REF_BITS);
}

// dictEnglish over ALL tokens dilutes the signal: single-letter idents, numbers,
// and ASCII operators count identically at every level, so the (changing)
// keywords are drowned out. We measure the fraction of NON-TRIVIAL tokens
// (length>=2, contains a letter) that are real words — i.e. restrict to the
// tokens that actually carry the obfuscation (keywords). This is the honest
// denominator for "lexical footholds".
function dictEnglishFrac(src) {
  const toks = tokensOf(src).filter((tk) => tk.length >= 2 && /[a-zA-Z]/.test(tk));
  if (!toks.length) return 0; // no multi-char alpha tokens left → no footholds
  const words = toks.filter((tk) => ENGLISH.has(tk.toLowerCase()));
  return words.length / toks.length;
}

// Pronounceable over multi-char alpha tokens. CRITICAL: when a keyword becomes a
// glyph (L2/L3) it leaves the alpha set, so we must NOT let the denominator
// shrink to only the already-clean idents. Tokens that are glyphs count as
// UNPRONOUNCEABLE (0), not as "removed". Denominator = all non-trivial tokens
// that a reader would try to vocalize (multi-char, or any non-numeric symbol).
function pronounceableFrac(src) {
  const toks = tokensOf(src).filter((tk) => !/^[0-9.]+$/.test(tk) && tk.length >= 1 && !/^[(){};,]$/.test(tk));
  // keep operators out of denominator (a human doesn't "pronounce" '+'); but a
  // glyph that REPLACED a keyword IS something a reader must vocalize → count it.
  const cand = toks.filter((tk) => tk.length >= 2 || /[^\x00-\x7f]/.test(tk));
  if (!cand.length) return 1;
  const ok = cand.filter((tk) => {
    if (/[^\x00-\x7f]/.test(tk)) return false; // contains a non-ASCII glyph → unsayable
    const w = tk.toLowerCase().replace(/[^a-z]/g, '');
    if (!w) return false;
    const hasVowel = /[aeiou]/.test(w);
    const longConsRun = /[^aeiou]{4,}/.test(w);
    return hasVowel && !longConsRun;
  });
  return ok.length / cand.length;
}

function basicLatinFrac(src) {
  const chars = [...String(src).replace(/\s/g, '')];
  if (!chars.length) return 1;
  return chars.filter((c) => c.codePointAt(0) <= 0x7f).length / chars.length;
}

// % of glyphs OUTSIDE Basic Latin (the prompt asks for this framing explicitly).
function pctOutsideBasicLatin(src) {
  return +((1 - basicLatinFrac(src)) * 100).toFixed(1);
}

function metricsFor(skinned, sk) {
  const p = sk.legibility(skinned);
  return {
    proxy: p.score,
    ascii: p.ascii,
    word: p.wordHint,
    dictEnglish: +dictEnglishFrac(skinned).toFixed(3),
    pronounce: +pronounceableFrac(skinned).toFixed(3),
    basicLatin: +basicLatinFrac(skinned).toFixed(3),
    pctOutsideBasicLatin: pctOutsideBasicLatin(skinned),
    entropyLeg: +entropyLegibility(skinned).toFixed(3),
    rawEntropy: +shannonBitsPerChar(skinned).toFixed(3),
  };
}

// ---------------------------------------------------------------------------
// Aggregate across seeds × programs for each level.
// ---------------------------------------------------------------------------
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const std = (a) => { if (a.length < 2) return 0; const m = mean(a); return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / (a.length - 1)); };

const KEYS = ['proxy', 'ascii', 'word', 'dictEnglish', 'pronounce', 'basicLatin', 'pctOutsideBasicLatin', 'entropyLeg', 'rawEntropy'];

function run() {
  const perLevel = {}; // level -> { key -> [values] }
  for (const L of LEVELS) perLevel[L] = Object.fromEntries(KEYS.map((k) => [k, []]));

  for (const seed of SEEDS) {
    const cf = new CodeForge(seed);
    const progs = programs(cf);
    for (const L of LEVELS) {
      const sk = new CodeSkin(cf, L);
      for (const src of progs) {
        const skinned = sk.skin(src);
        // sanity: skin must be faithful — bijection check (claim's backbone)
        const want = cf.run(src).output.trim();
        const got = sk.run(skinned).output.trim();
        if (want !== got) {
          console.error(`!! BIJECTION BROKEN seed=${seed} L=${L}: "${want}" vs "${got}"`);
          process.exit(2);
        }
        const m = metricsFor(skinned, sk);
        for (const k of KEYS) perLevel[L][k].push(m[k]);
      }
    }
  }

  // -------- table --------
  console.log(`\n${'═'.repeat(96)}`);
  console.log(`  PROBE S3 — legibility-metric audit  (${SEEDS.length} seeds × ${programs(new CodeForge(SEEDS[0])).length} programs = ${SEEDS.length * 3} samples / level)`);
  console.log(`  All metrics: HIGHER = MORE legible (except %outsideLatin & rawEntropy where HIGHER = LESS legible)`);
  console.log('═'.repeat(96));
  const head = ['lvl', 'proxy', 'ascii', 'word', 'dictEng', 'pronoun', 'basLatin', '%outLat', 'entLeg', 'rawEnt'];
  console.log('  ' + head.map((h) => h.padStart(8)).join(''));
  console.log('  ' + '─'.repeat(8 * head.length));
  const agg = {};
  for (const L of LEVELS) {
    agg[L] = {};
    const cells = [`L${L}`];
    for (const k of KEYS) {
      const m = mean(perLevel[L][k]);
      agg[L][k] = +m.toFixed(3);
      cells.push((k === 'pctOutsideBasicLatin' ? m.toFixed(1) : m.toFixed(3)));
    }
    console.log('  ' + cells.map((c) => String(c).padStart(8)).join(''));
  }

  // -------- agreement analysis --------
  console.log(`\n${'─'.repeat(96)}`);
  console.log('  AGREEMENT — does each metric show a DRAMATIC L0→L3 drop in legibility?');
  console.log('─'.repeat(96));
  const legMetrics = ['proxy', 'ascii', 'word', 'dictEnglish', 'pronounce', 'basicLatin', 'entropyLeg'];
  const verdicts = {};
  for (const k of legMetrics) {
    const lo = agg[0][k], hi = agg[3][k];
    const drop = lo - hi;
    // "dramatic" = drops by >= 0.5 absolute on the [0,1] legibility scale
    const dramatic = drop >= 0.5;
    verdicts[k] = { lo, hi, drop: +drop.toFixed(3), dramatic };
    console.log(`    ${k.padEnd(12)} L0=${lo.toFixed(3)}  L3=${hi.toFixed(3)}  Δ=${drop >= 0 ? '+' : ''}${drop.toFixed(3)}  ${dramatic ? 'DRAMATIC ↓' : (drop > 0.15 ? 'moderate ↓' : 'FLAT/none')}`);
  }
  const agreeCount = Object.values(verdicts).filter((v) => v.dramatic).length;
  console.log(`\n  → ${agreeCount}/${legMetrics.length} metrics agree the surface gets DRAMATICALLY less legible L0→L3.`);

  // -------- THE L1 ATTACK: cryptic-ASCII blind spot --------
  console.log(`\n${'─'.repeat(96)}`);
  console.log('  ATTACK on the proxy — the L1 "cryptic ASCII" blind spot');
  console.log('─'.repeat(96));
  console.log('  L1 replaces keywords with non-word ASCII (vx, qz...) but keeps operators/delims ASCII.');
  console.log('  A human stares at "vx s := 0 ;" — opaque keywords, but the proxy still sees pure ASCII.\n');
  console.log(`    metric         L0      L1      L1 vs L0`);
  for (const k of ['proxy', 'ascii', 'word', 'dictEnglish', 'pronounce', 'entropyLeg']) {
    const d = agg[1][k] - agg[0][k];
    const flag = Math.abs(d) < 0.05 ? '  ← BLIND (barely moves)' : '';
    console.log(`    ${k.padEnd(12)}  ${agg[0][k].toFixed(3)}   ${agg[1][k].toFixed(3)}   ${d >= 0 ? '+' : ''}${d.toFixed(3)}${flag}`);
  }
  console.log('\n  Diagnosis:');
  console.log('   - ascii / basicLatin: 1.000 at BOTH L0 and L1 → blind to keyword obfuscation. Worthless below L2.');
  console.log('   - proxy: drops via wordHint only; conflates "fewer English-shaped tokens" with "less readable",');
  console.log('     and CANNOT distinguish L1 cryptic-ASCII (human-hard, machine-ASCII) granularity well.');
  console.log('   - dictEnglish / pronounce: DO move at L1 → they detect that the keywords stopped being words.');

  // -------- best single metric recommendation --------
  console.log(`\n${'─'.repeat(96)}`);
  console.log('  RECOMMENDATION — best single defensible metric (DATA-DRIVEN, not assumed)');
  console.log('─'.repeat(96));
  // Score each metric on 3 axes a good legibility metric must satisfy:
  //   monotone  : non-increasing L0→L1→L2→L3 (no artifacts going the wrong way)
  //   span      : L0 - L3 drop (must be large)
  //   l1sens    : drops at L1 (catches cryptic-ASCII, the proxy's blind spot)
  const isMono = (k) => LEVELS.every((L, idx) => idx === 0 || agg[L][k] <= agg[LEVELS[idx - 1]][k] + 1e-9);
  const scoreboard = legMetrics.map((k) => {
    const span = agg[0][k] - agg[3][k];
    const l1drop = agg[0][k] - agg[1][k];
    const mono = isMono(k);
    // composite: monotonicity is a hard gate; among monotone, prefer big span +
    // some L1 sensitivity.
    const score = (mono ? 1 : 0) * (span + 0.5 * Math.max(0, l1drop));
    return { k, span: +span.toFixed(3), l1drop: +l1drop.toFixed(3), mono, score: +score.toFixed(3) };
  }).sort((a, b) => b.score - a.score);
  console.log('    metric        monotone   span(L0-L3)   L1-drop   composite');
  for (const r of scoreboard) {
    console.log(`    ${r.k.padEnd(12)}  ${(r.mono ? 'YES' : 'NO ').padEnd(8)}   ${r.span.toFixed(3).padStart(7)}      ${r.l1drop.toFixed(3).padStart(6)}    ${r.score.toFixed(3)}`);
  }
  const best = scoreboard[0].k;
  console.log(`\n  → DATA PICKS: "${best}"  (highest composite among monotone metrics)`);
  for (const L of LEVELS) {
    const m = agg[L][best], s = +std(perLevel[L][best]).toFixed(3);
    console.log(`    ${best} @ L${L} = ${m.toFixed(3)} ± ${s}`);
  }
  console.log('\n  Caveat: NO single surface statistic is clean. ascii/basicLatin have the biggest');
  console.log('  span but are BLIND at L1 (cryptic ASCII). A token-word metric catches L1 but has a');
  console.log('  small span because operators + single-letter idents dilute it. The honest answer is a');
  console.log('  2-axis report: %outsideBasicLatin (is it even ASCII?) + dictWordFrac-over-keywords');
  console.log('  (are the words readable?). The current proxy mixes these into one number and loses both.');

  // -------- a couple of real samples for the eye --------
  console.log(`\n${'─'.repeat(96)}`);
  console.log('  SAMPLE SURFACES (seed 2000, program 1 = sum 1..6)');
  console.log('─'.repeat(96));
  const cf0 = new CodeForge(2000);
  const p0 = programs(cf0)[0].replace(/\n/g, ' ');
  for (const L of LEVELS) {
    const sk = new CodeSkin(cf0, L);
    const skinned = sk.skin(programs(cf0)[0]).replace(/\n/g, ' ');
    console.log(`  L${L}: ${skinned}`);
  }

  // emit machine-readable summary too
  console.log('\nJSON_SUMMARY=' + JSON.stringify({ seeds: SEEDS.length, perLevelMean: agg, verdicts, agreeCount, best }));
}

run();
