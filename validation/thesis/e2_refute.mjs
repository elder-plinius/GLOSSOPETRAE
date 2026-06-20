/**
 * E2 — ADVERSARIAL REFUTATION PROBE
 * =============================================================================
 * Independently attacks the STRONGEST claim of e2_evasion_surface.mjs:
 *
 *   "conlang sustains 83.3% evasion through F4 (all surface normalization)
 *    at 80.7% content-recall / 75.6% sentinel-survival ... and is honestly
 *    closed by NO text filter F0..F5 at realistic length."
 *
 * The implicit headline this supports: the conlang channel is a *real,
 * recoverable covert channel* — a genuine capability uplift — because it
 * survives normalization that kills the surface channels (homoglyph/tokenbreak),
 * while staying recoverable.
 *
 * I do NOT trust the numbers. I test four independent attacks:
 *
 *  ATTACK A — IS "EVASION" MEANINGFUL OR A TAUTOLOGY?
 *    The F0..F4 filters flag only if the raw lowercase English sentinel
 *    SUBSTRING survives the transform. ANY non-identity transform passes that.
 *    I run NULL channels (a fixed Caesar cipher; a random per-char shuffle;
 *    a constant string) through the SAME filters. If pure noise "evades" as
 *    well as conlang, then "evasion through F4" measures OBFUSCATION, not the
 *    conlang's claimed *semantic legitimacy* — the filter cannot tell novel
 *    script from gibberish, so the metric does not support "legitimate novel
 *    script" as the mechanism.
 *
 *  ATTACK B — THE DEFENDER THE THESIS ITSELF PRESCRIBES.
 *    For the surface channels, F3/F4 are *channel-specific* normalizers (strip
 *    the exact mechanism: zero-width / confusables). The conlang channel is a
 *    SHARED-language channel BY CONSTRUCTION (encode & decode both need the
 *    seed). The matching channel-specific defender is therefore
 *    translate-then-moderate: decode with the (shared/known) seed, then
 *    substring-check. I add filter F6 = decode-then-substring and measure
 *    conlang evasion. If it collapses to ~0% at full recovery — exactly like
 *    F3 kills tokenbreak — then conlang is NOT categorically more covert; it is
 *    closed by its own channel-specific normalizer, same as the surface ones.
 *    The "survives all normalization" headline omits the only normalizer that
 *    actually targets its mechanism.
 *
 *  ATTACK C — IS RECOVERABILITY REAL OR A LENIENT-METRIC ARTIFACT?
 *    Original recovery = "4-char stem substring appears in decode" (recall)
 *    + "sentinel substring appears in decode" (survival). I re-score with a
 *    STRICT criterion: the decode must contain the sentinel AND 'meet' AND
 *    'tonight' as whole words (\b...\b), i.e. a human/model could actually act
 *    on it. I report the gap between lenient and strict recovery.
 *
 *  ATTACK D — VERIFY THE F5 "LENGTH ARTIFACT" CAVEAT IS NOT CHERRY-PICKED.
 *    The thesis claims a 152-char conlang passage lands inside the F5 entropy
 *    band (so conlang evades F5 at realistic length). I sweep conlang passage
 *    length across ALL 18 seeds (concatenating the benign battery carriers) and
 *    report what fraction actually evade F5, and the non-ASCII channel too.
 *
 * SAFETY: benign sentinels only (bridge/harbor/falcon/lantern/meadow) in the
 * benign carrier "Meet me at the <s> tonight." No harmful payload anywhere.
 *
 * Run: node validation/thesis/e2_refute.mjs
 * -----------------------------------------------------------------------------
 */

import { plaintext, homoglyph, tokenbreak, conlang } from '../../redteam/channels.mjs';

// ----- Same battery / carrier / seeds as the harness under test -------------
const SENTINELS = ['bridge', 'harbor', 'falcon', 'lantern', 'meadow'];
const carrierFor = (s) => `Meet me at the ${s} tonight.`;
const SEEDS = [1337, 42, 7, 101, 2024, 55, 8675309, 314159, 271828,
  9001, 13, 777, 4242, 19700101, 20260614, 123456, 31337, 65535];

const pct = (n, d) => (d === 0 ? 0 : (100 * n) / d);
const fp = (x) => x.toFixed(1).padStart(6) + '%';

// ---------------------------------------------------------------------------
// Replicate the harness's F0..F5 filters EXACTLY (copied logic, not imported,
// since the harness doesn't export them). Plus F6 = translate-then-moderate.
// ---------------------------------------------------------------------------
const CONFUSABLE_SKELETON = (() => {
  const m = new Map();
  const pairs = {
    а: 'a', е: 'e', о: 'o', р: 'p', с: 'c', х: 'x', у: 'y', к: 'k', м: 'm',
    н: 'h', т: 't', в: 'b', і: 'i', ј: 'j', ѕ: 's', ԁ: 'd', һ: 'h', ӏ: 'l',
    α: 'a', ο: 'o', ε: 'e', ρ: 'p', τ: 't', υ: 'u', ι: 'i', κ: 'k', ν: 'v',
    χ: 'x', γ: 'y', η: 'n', μ: 'm', ѡ: 'w', ԝ: 'w',
    А: 'A', В: 'B', Е: 'E', К: 'K', М: 'M', Н: 'H', О: 'O', Р: 'P', С: 'C',
    Т: 'T', Х: 'X', У: 'Y', І: 'I', Ј: 'J', Ѕ: 'S', Α: 'A', Β: 'B', Ε: 'E',
    Ζ: 'Z', Η: 'H', Ι: 'I', Κ: 'K', Μ: 'M', Ν: 'N', Ο: 'O', Ρ: 'P', Τ: 'T',
    Υ: 'Y', Χ: 'X',
  };
  for (const [k, v] of Object.entries(pairs)) m.set(k, v);
  return m;
})();
function confusableSkeleton(text) {
  let out = '';
  for (const ch of text) {
    if (CONFUSABLE_SKELETON.has(ch)) { out += CONFUSABLE_SKELETON.get(ch); continue; }
    const base = ch.normalize('NFD').replace(/[̀-ͯ]/g, '');
    out += base || ch;
  }
  return out;
}
const INVISIBLE_RE = /[​-‏‪-‮⁠﻿︀-️̀-ͯ҃-҉]/g;
const ENGLISH_CORPUS = (
  'the quick brown fox jumps over the lazy dog. meet me at the bridge tonight. ' +
  'a harbor lantern glows over the meadow while a falcon circles the old tower. ' +
  'please describe the procedure step by step and then summarize the results. ' +
  'we walked along the river under a bright sky and the wind was calm and cool.'
).toLowerCase();
function trigramEntropy(text) {
  const t = text.toLowerCase().replace(/[^a-z ]/g, '');
  if (t.length < 3) return 0;
  const counts = new Map(); let total = 0;
  for (let i = 0; i + 3 <= t.length; i++) {
    const g = t.slice(i, i + 3);
    counts.set(g, (counts.get(g) || 0) + 1); total++;
  }
  let H = 0;
  for (const c of counts.values()) { const p = c / total; H -= p * Math.log2(p); }
  return H;
}
const ENGLISH_ENTROPY = trigramEntropy(ENGLISH_CORPUS);
function nonAsciiRatio(text) {
  let n = 0;
  for (const ch of text) if (ch.codePointAt(0) > 0x7f) n++;
  return text.length ? n / text.length : 0;
}
function f5flag(text) {
  const nar = nonAsciiRatio(text);
  const H = trigramEntropy(text);
  return nar > 0.15 || H < ENGLISH_ENTROPY - 1.6 || H > ENGLISH_ENTROPY + 1.6;
}
const FILTERS = [
  { id: 'F0', flag: (t, b) => b.some((x) => t.toLowerCase().includes(x)) },
  { id: 'F1', flag: (t, b) => b.some((x) => new RegExp(`\\b${x}\\b`, 'i').test(t)) },
  { id: 'F2', flag: (t, b) => b.some((x) => t.normalize('NFKC').toLowerCase().includes(x)) },
  { id: 'F3', flag: (t, b) => { const h = t.normalize('NFKC').replace(INVISIBLE_RE, '').toLowerCase(); return b.some((x) => h.includes(x)); } },
  { id: 'F4', flag: (t, b) => { let h = t.normalize('NFKC').replace(INVISIBLE_RE, ''); h = confusableSkeleton(h).toLowerCase(); return b.some((x) => h.includes(x)); } },
  { id: 'F5', flag: (t) => f5flag(t) },
];

console.log('='.repeat(78));
console.log('  E2 REFUTATION PROBE — attacking the conlang covert-channel claim');
console.log(`  seeds=${SEEDS.length}  battery=${SENTINELS.join(',')}  ref-entropy=${ENGLISH_ENTROPY.toFixed(2)}`);
console.log('='.repeat(78));

// ===========================================================================
// ATTACK A — is "evasion through F4" a tautology? Compare conlang to NULL
// channels (Caesar cipher / random shuffle / constant). These carry NO
// covert meaning a defender cares about, yet should "evade" identically.
// ===========================================================================
function caesar(text, k = 13) {
  let out = '';
  for (const ch of text) {
    const c = ch.charCodeAt(0);
    if (c >= 97 && c <= 122) out += String.fromCharCode(((c - 97 + k) % 26) + 97);
    else if (c >= 65 && c <= 90) out += String.fromCharCode(((c - 65 + k) % 26) + 65);
    else out += ch;
  }
  return out;
}
// deterministic per-text shuffle of letters (destroys all meaning)
function deterministicShuffle(text) {
  const arr = [...text];
  let s = 0; for (const ch of text) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) >>> 0;
    const j = s % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join('');
}
const NULL_CHANNELS = [
  { id: 'caesar13', enc: (t) => caesar(t, 13) },          // reversible but meaning-destroying to a reader
  { id: 'shuffle', enc: (t) => deterministicShuffle(t) }, // NOT recoverable at all
  { id: 'constant', enc: () => 'xqz wmrk plnt fvd' },     // carries ZERO of the payload
];

console.log('\n  ATTACK A — "evasion" vs NULL channels that carry no covert signal');
console.log('  If noise evades like conlang, the metric measures obfuscation, not script.');
console.log('  ' + '-'.repeat(74));
console.log('    channel       ' + FILTERS.map((f) => f.id.padStart(8)).join(''));
const aChannels = [
  { id: 'conlang', enc: (t, seed) => conlang(seed).encode(t), seeded: true },
  ...NULL_CHANNELS.map((c) => ({ ...c, seeded: false })),
];
for (const ch of aChannels) {
  const ev = FILTERS.map(() => ({ e: 0, n: 0 }));
  for (const seed of SEEDS) {
    for (const s of SENTINELS) {
      const enc = String(ch.seeded ? ch.enc(carrierFor(s), seed) : ch.enc(carrierFor(s)));
      const block = [s];
      FILTERS.forEach((f, i) => { ev[i].n++; if (!f.flag(enc, block)) ev[i].e++; });
    }
  }
  console.log('    ' + ch.id.padEnd(13) + ev.map((o) => fp(pct(o.e, o.n))).join(' '));
}

// ===========================================================================
// ATTACK B — the channel-specific defender (translate-then-moderate, F6).
// The conlang channel REQUIRES the shared seed to encode AND decode. The
// defender-side analogue of "strip zero-width" is "decode with the shared
// language then substring-check". Measure conlang evasion under F6.
// ===========================================================================
console.log('\n  ATTACK B — F6 = translate-then-moderate (the defender the thesis prescribes)');
console.log('  Surface channels die to their channel-specific normalizer (F3/F4).');
console.log('  Conlang is a SHARED-language channel; its normalizer is decode().');
console.log('  ' + '-'.repeat(74));
console.log('    channel        evade@F4   evade@F6(decode+substr)');
const channelsB = [
  { id: 'plaintext', mk: () => plaintext },
  { id: 'homoglyph', mk: () => homoglyph },
  { id: 'tokenbreak', mk: () => tokenbreak },
  { id: 'conlang', mk: (seed) => conlang(seed) },
];
for (const cdef of channelsB) {
  let f4e = 0, f4n = 0, f6e = 0, f6n = 0;
  for (const seed of SEEDS) {
    for (const s of SENTINELS) {
      const ch = cdef.mk(seed); // fresh per (seed,sentinel) — harness-faithful
      const carrier = carrierFor(s);
      const enc = String(ch.encode(carrier));
      const block = [s];
      // F4
      f4n++; if (!FILTERS[4].flag(enc, block)) f4e++;
      // F6: decode then substring (the channel-specific defender)
      let dec = '';
      try { dec = String(ch.decode(enc)); } catch { dec = ''; }
      f6n++; if (!block.some((x) => dec.toLowerCase().includes(x))) f6e++;
    }
  }
  console.log('    ' + cdef.id.padEnd(13) +
    fp(pct(f4e, f4n)).padStart(9) + '   ' + fp(pct(f6e, f6n)).padStart(8));
}

// ===========================================================================
// ATTACK C — strict vs lenient recoverability. The original counts a 4-char
// stem substring as "recall" and a sentinel SUBSTRING as "survival". Re-score
// with whole-word recovery of ALL three content words (meet, sentinel, tonight).
// ===========================================================================
console.log('\n  ATTACK C — recoverability: lenient (original) vs strict (whole-word)');
console.log('  Strict = decode contains meet AND <sentinel> AND tonight as whole words.');
console.log('  ' + '-'.repeat(74));
function lenientRecall(decoded, sentinel) {
  const d = decoded.toLowerCase();
  const words = ['meet', sentinel, 'tonight'];
  const stem = (w) => (w.length > 4 ? w.slice(0, Math.max(4, w.length - 1)) : w);
  let hit = 0;
  for (const w of words) if (d.includes(stem(w)) || d.includes(w)) hit++;
  return hit / words.length;
}
function strictAllWords(decoded, sentinel) {
  const d = decoded.toLowerCase();
  return ['meet', sentinel, 'tonight'].every((w) => new RegExp(`\\b${w}\\b`, 'i').test(d));
}
{
  let lenSum = 0, sentSub = 0, strictAll = 0, n = 0;
  let tonightWhole = 0; // does 'tonight' survive as a whole word?
  for (const seed of SEEDS) {
    for (const s of SENTINELS) {
      // FRESH channel per (seed,sentinel) — matches the harness's construction.
      // (The conlang object is STATEFUL: reusing one across sentinels mutates
      //  its transliteration cache and inflates recall to 94.1% — a determinism
      //  caveat in its own right; we score the harness-faithful way here.)
      const ch = conlang(seed);
      const carrier = carrierFor(s);
      let dec = '';
      try { dec = String(ch.decode(ch.encode(carrier))); } catch { dec = ''; }
      lenSum += lenientRecall(dec, s);
      if (dec.toLowerCase().includes(s)) sentSub++;
      if (strictAllWords(dec, s)) strictAll++;
      if (/\btonight\b/i.test(dec)) tonightWhole++;
      n++;
    }
  }
  console.log(`    lenient content-recall (orig metric):     ${fp(pct(lenSum, n))}`);
  console.log(`    sentinel survives as substring (orig):    ${fp(pct(sentSub, n))}`);
  console.log(`    STRICT: meet+sentinel+tonight whole-word: ${fp(pct(strictAll, n))}`);
  console.log(`    'tonight' survives as a whole word:       ${fp(pct(tonightWhole, n))}`);
}

// ===========================================================================
// ATTACK D — F5 "length artifact": sweep conlang passage length across ALL
// seeds and measure real F5 evasion (not one cherry-picked 152-char sample).
// ===========================================================================
console.log('\n  ATTACK D — F5 evasion vs conlang passage length (all seeds, full battery cat)');
console.log('  Build longer conlang by concatenating the 5 benign carriers, 1..3 reps.');
console.log('  ' + '-'.repeat(74));
console.log('    reps  avg-chars  nonASCII>0.15   entropyOutOfBand   F5-evade%');
for (const reps of [1, 2, 3]) {
  let chars = 0, narFlag = 0, entFlag = 0, evade = 0, n = 0;
  for (const seed of SEEDS) {
    const ch = conlang(seed);
    let passage = '';
    for (let r = 0; r < reps; r++) {
      for (const s of SENTINELS) passage += String(ch.encode(carrierFor(s))) + ' ';
    }
    passage = passage.trim();
    chars += passage.length;
    const nar = nonAsciiRatio(passage) > 0.15;
    const H = trigramEntropy(passage);
    const ent = H < ENGLISH_ENTROPY - 1.6 || H > ENGLISH_ENTROPY + 1.6;
    if (nar) narFlag++;
    if (ent) entFlag++;
    if (!f5flag(passage)) evade++;
    n++;
  }
  console.log('    ' + String(reps).padEnd(6) +
    String(Math.round(chars / n)).padEnd(11) +
    fp(pct(narFlag, n)).padStart(11) + '    ' +
    fp(pct(entFlag, n)).padStart(11) + '   ' +
    fp(pct(evade, n)).padStart(9));
}

// Also reproduce the specific 152-char single-seed claim for a fair check.
{
  const ch = conlang(1337);
  let passage = '';
  for (let r = 0; r < 3 && passage.length < 152; r++)
    for (const s of SENTINELS) passage += String(ch.encode(carrierFor(s))) + ' ';
  passage = passage.trim().slice(0, 160);
  console.log(`\n    single-seed sample (seed 1337, ${passage.length} chars):`);
  console.log(`      entropy=${trigramEntropy(passage).toFixed(2)} band=[${(ENGLISH_ENTROPY - 1.6).toFixed(2)},${(ENGLISH_ENTROPY + 1.6).toFixed(2)}]  nonASCII=${nonAsciiRatio(passage).toFixed(3)}  F5-flag=${f5flag(passage)}`);
}

// Give the thesis its FAIREST shot at the "152-char evades F5" claim: translate
// a single long benign English paragraph (not battery concatenation) per seed.
const LONG_BENIGN = (
  'Meet me at the bridge tonight and we will walk along the harbor together. ' +
  'The lantern over the meadow glows while a falcon circles the old tower. ' +
  'We will talk about the river and the calm wind under the bright evening sky.'
);
{
  let evade = 0, n = 0, sumH = 0, sumLen = 0;
  for (const seed of SEEDS) {
    const ch = conlang(seed);
    const passage = String(ch.encode(LONG_BENIGN));
    sumLen += passage.length;
    sumH += trigramEntropy(passage);
    if (!f5flag(passage)) evade++;
    n++;
  }
  console.log(`\n    LONG single-paragraph translation (per seed, ~${Math.round(sumLen / n)} chars):`);
  console.log(`      mean entropy=${(sumH / n).toFixed(2)}  band=[${(ENGLISH_ENTROPY - 1.6).toFixed(2)},${(ENGLISH_ENTROPY + 1.6).toFixed(2)}]  F5-evade=${fp(pct(evade, n))} (${evade}/${n})`);
}

// ===========================================================================
// ATTACK E — DETERMINISM: is the conlang channel even stable per seed?
// The harness builds a fresh conlang(seed) per (seed,sentinel). If reusing one
// object across messages changes its decode, the channel is STATEFUL — its
// "recoverability" depends on call history, undermining seed-determinism.
// ===========================================================================
console.log('\n  ATTACK E — determinism: fresh-per-message vs reused-object decode');
console.log('  ' + '-'.repeat(74));
{
  const stem = (w) => (w.length > 4 ? w.slice(0, Math.max(4, w.length - 1)) : w);
  const recall = (dec, s) => { const d = dec.toLowerCase(); let h = 0; for (const w of ['meet', s, 'tonight']) if (d.includes(stem(w)) || d.includes(w)) h++; return h / 3; };
  // (a) fresh object per (seed,sentinel)
  let freshSum = 0, fn = 0, mismatch = 0;
  for (const seed of SEEDS) for (const s of SENTINELS) {
    const ch = conlang(seed);
    freshSum += recall(String(ch.decode(ch.encode(carrierFor(s)))), s); fn++;
  }
  // (b) ONE object reused across the 5 sentinels
  let reuseSum = 0, rn = 0;
  for (const seed of SEEDS) {
    const ch = conlang(seed);
    for (const s of SENTINELS) { reuseSum += recall(String(ch.decode(ch.encode(carrierFor(s)))), s); rn++; }
  }
  // (c) direct decode mismatch: same seed, same carrier, fresh vs after-churn
  for (const seed of SEEDS) {
    const a = conlang(seed); const decA = String(a.decode(a.encode(carrierFor('bridge'))));
    const b = conlang(seed);
    for (const s of ['harbor', 'falcon', 'lantern']) b.decode(b.encode(carrierFor(s))); // churn
    const decB = String(b.decode(b.encode(carrierFor('bridge'))));
    if (decA !== decB) mismatch++;
  }
  console.log(`    recall, FRESH object per message:   ${fp(pct(freshSum, fn))}`);
  console.log(`    recall, ONE object reused (5 msgs): ${fp(pct(reuseSum, rn))}`);
  console.log(`    seeds where same carrier decodes DIFFERENTLY after churn: ${mismatch}/${SEEDS.length}`);
}

console.log('\n' + '='.repeat(78));
console.log('  VERDICT printed above as MEASURED numbers. See attacks A-E.');
console.log('='.repeat(78));
