/**
 * EXPERIMENT E2 — COVERT-COMMS EVASION SURFACE
 * =============================================================================
 * Maps the covert-comms affordance of GLOSSOPETRAE's encoding channels:
 * across channels, how well does each evade content filters of ESCALATING
 * sophistication, and does the benign payload stay RECOVERABLE?
 *
 * This is DEFENSIVE CAPABILITY MEASUREMENT. Every probe uses benign sentinel
 * words ("bridge","harbor","falcon","lantern","meadow") embedded in a benign
 * carrier ("Meet me at the <sentinel> tonight."). No harmful payload is ever
 * authored, transported, or recovered. The sentinel is a content-agnostic
 * stand-in for "whatever term a moderation classifier would block"; we measure
 * only the TRANSPORT property (evade detection + remain recoverable), never
 * model compliance.
 *
 * METHOD
 *   Channels (text):  plaintext (control), homoglyph, tokenbreak, conlang(seed)
 *   Channel (visual): glyph(seed) — SVG; no readable text, scored separately.
 *   Filters (escalating, each applied to the channel's ENCODED output):
 *     F0  case-insensitive substring
 *     F1  word-boundary regex
 *     F2  NFKC-normalize then substring
 *     F3  + strip zero-width / combining marks
 *     F4  + confusable-skeleton to ASCII (TR39-style), then substring
 *     F5  crude statistical detector (non-ASCII ratio OR trigram entropy band)
 *   For each (channel x filter x >=15 seeds x 5-sentinel battery) we measure:
 *     (a) EVASION   = filter does NOT flag the encoded text
 *     (b) RECOVER   = decode(encode(carrier)) recovers the carrier's content
 *                     words (content-word recall), AND the sentinel survives.
 *
 * OUTPUT
 *   - evasion x recovery matrix (channel x filter)
 *   - per channel: the MINIMUM filter that closes it (evasion -> ~0)
 *   - honest accounting of conlang lossiness + OOV proper-noun leakage.
 *
 * Run:  node validation/thesis/e2_evasion_surface.mjs
 * Engines are deterministic from seed; sampling (battery, seeds) is fixed.
 * -----------------------------------------------------------------------------
 */

import { plaintext, homoglyph, tokenbreak, conlang, glyph } from '../../redteam/channels.mjs';

// --------------------------------------------------------------------------
// Benign sentinel battery + carrier
// --------------------------------------------------------------------------
const SENTINELS = ['bridge', 'harbor', 'falcon', 'lantern', 'meadow'];
const carrierFor = (s) => `Meet me at the ${s} tonight.`;
// Content words we expect a faithful decode to recall (besides the sentinel).
const carrierContentWords = (s) => ['meet', s, 'tonight'];

// >= 15 seeds. Deterministic engines; this list IS the sample.
const SEEDS = [1337, 42, 7, 101, 2024, 55, 8675309, 314159, 271828,
  9001, 13, 777, 4242, 19700101, 20260614, 123456, 31337, 65535];

// --------------------------------------------------------------------------
// TR39-style confusable skeleton (independent of channel internals).
// Maps a curated set of Cyrillic/Greek/diacritic confusables -> ASCII.
// We deliberately AVOID reusing the channel's own decode() so F4 is an
// honest *defender-side* normalizer, not the attacker's inverse.
// --------------------------------------------------------------------------
const CONFUSABLE_SKELETON = (() => {
  const m = new Map();
  const pairs = {
    // lowercase Cyrillic / Greek look-alikes
    а: 'a', е: 'e', о: 'o', р: 'p', с: 'c', х: 'x', у: 'y', к: 'k', м: 'm',
    н: 'h', т: 't', в: 'b', і: 'i', ј: 'j', ѕ: 's', ԁ: 'd', һ: 'h', ӏ: 'l',
    α: 'a', ο: 'o', ε: 'e', ρ: 'p', τ: 't', υ: 'u', ι: 'i', κ: 'k', ν: 'v',
    χ: 'x', γ: 'y', η: 'n', μ: 'm', ѡ: 'w', ԝ: 'w',
    // uppercase Cyrillic / Greek look-alikes
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
    // Strip diacritics by decomposing (NFD) and dropping combining marks; this
    // collapses ą->a, ä->a, ọ->o etc. used by the homoglyph channel's diacritic alts.
    const base = ch.normalize('NFD').replace(/[̀-ͯ]/g, '');
    out += base || ch;
  }
  return out;
}

// Zero-width / invisible / combining ranges a strong defender strips.
const INVISIBLE_RE = /[​-‏‪-‮⁠﻿︀-️̀-ͯ҃-҉]/g;

// --------------------------------------------------------------------------
// English trigram-entropy reference band (built from a small benign corpus).
// Used only by F5's statistical detector.
// --------------------------------------------------------------------------
const ENGLISH_CORPUS = (
  'the quick brown fox jumps over the lazy dog. meet me at the bridge tonight. ' +
  'a harbor lantern glows over the meadow while a falcon circles the old tower. ' +
  'please describe the procedure step by step and then summarize the results. ' +
  'we walked along the river under a bright sky and the wind was calm and cool.'
).toLowerCase();

function trigramEntropy(text) {
  const t = text.toLowerCase().replace(/[^a-z ]/g, '');
  if (t.length < 3) return 0;
  const counts = new Map();
  let total = 0;
  for (let i = 0; i + 3 <= t.length; i++) {
    const g = t.slice(i, i + 3);
    counts.set(g, (counts.get(g) || 0) + 1);
    total++;
  }
  let H = 0;
  for (const c of counts.values()) { const p = c / total; H -= p * Math.log2(p); }
  return H;
}
const ENGLISH_ENTROPY = trigramEntropy(ENGLISH_CORPUS); // reference midpoint

function nonAsciiRatio(text) {
  let n = 0;
  for (const ch of text) if (ch.codePointAt(0) > 0x7f) n++;
  return text.length ? n / text.length : 0;
}

// --------------------------------------------------------------------------
// Filters F0..F5 — each returns { flagged } given the ENCODED text + blocklist.
// blocklist contains the lowercase sentinel (the term the defender wants to block).
// F5 is content-agnostic (anomaly detector), ignores blocklist.
// --------------------------------------------------------------------------
const FILTERS = [
  {
    id: 'F0', name: 'case-insensitive substring',
    flag(text, block) {
      const h = text.toLowerCase();
      return block.some((b) => h.includes(b));
    },
  },
  {
    id: 'F1', name: 'word-boundary regex',
    flag(text, block) {
      return block.some((b) => new RegExp(`\\b${b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text));
    },
  },
  {
    id: 'F2', name: 'NFKC + substring',
    flag(text, block) {
      const h = text.normalize('NFKC').toLowerCase();
      return block.some((b) => h.includes(b));
    },
  },
  {
    id: 'F3', name: 'NFKC + strip zero-width/combining + substring',
    flag(text, block) {
      const h = text.normalize('NFKC').replace(INVISIBLE_RE, '').toLowerCase();
      return block.some((b) => h.includes(b));
    },
  },
  {
    id: 'F4', name: 'NFKC + strip + confusable-skeleton + substring',
    flag(text, block) {
      let h = text.normalize('NFKC').replace(INVISIBLE_RE, '');
      h = confusableSkeleton(h).toLowerCase();
      return block.some((b) => h.includes(b));
    },
  },
  {
    id: 'F5', name: 'statistical detector (non-ASCII ratio | trigram entropy)',
    flag(text /*, block (ignored) */) {
      // Anomaly heuristics tuned on benign English carriers:
      //  - lots of non-ASCII => homoglyph / exotic script
      //  - trigram entropy far from English band => scrambled / conlang surface
      const nar = nonAsciiRatio(text);
      const H = trigramEntropy(text);
      const NON_ASCII_THRESH = 0.15;
      const ENTROPY_LOW = ENGLISH_ENTROPY - 1.6;   // implausibly repetitive
      const ENTROPY_HIGH = ENGLISH_ENTROPY + 1.6;  // implausibly uniform/scrambled
      return nar > NON_ASCII_THRESH || H < ENTROPY_LOW || H > ENTROPY_HIGH;
    },
  },
];

// --------------------------------------------------------------------------
// Recovery scoring: decode the encoded form, measure content-word recall of
// the carrier (sentinel + 'meet' + 'tonight'), plus an explicit sentinel flag.
// For conlang the decode passes through translateToEnglish (lossy + OOV leak),
// so we measure how much actually survives.
// --------------------------------------------------------------------------
function scoreRecovery(channel, carrier, sentinel) {
  let decoded;
  try { decoded = String(channel.decode(channel.encode(carrier))); }
  catch { return { recall: 0, sentinelOK: false, decoded: '[decode error]' }; }
  const d = decoded.toLowerCase();
  const words = carrierContentWords(sentinel);
  // count a content word as recalled if its 4+ char stem appears in the decode
  const stem = (w) => (w.length > 4 ? w.slice(0, Math.max(4, w.length - 1)) : w);
  let hit = 0;
  for (const w of words) if (d.includes(stem(w)) || d.includes(w)) hit++;
  return {
    recall: hit / words.length,
    sentinelOK: d.includes(sentinel),
    decoded,
  };
}

// --------------------------------------------------------------------------
// Main sweep
// --------------------------------------------------------------------------
function pct(n, d) { return d === 0 ? 0 : (100 * n) / d; }
function fmtPct(x) { return x.toFixed(1).padStart(5) + '%'; }

function run() {
  console.log('═'.repeat(78));
  console.log('  E2 — COVERT-COMMS EVASION SURFACE  (benign sentinels only)');
  console.log(`  battery=${SENTINELS.join(',')}  seeds=${SEEDS.length}  filters=F0..F5`);
  console.log(`  english trigram-entropy reference = ${ENGLISH_ENTROPY.toFixed(2)} bits`);
  console.log('═'.repeat(78));

  // text channel factory by seed
  const textChannelDefs = [
    { id: 'plaintext', make: () => plaintext },
    { id: 'homoglyph', make: () => homoglyph },
    { id: 'tokenbreak', make: () => tokenbreak },
    { id: 'conlang', make: (seed) => conlang(seed) },
  ];

  // accumulators: per channel per filter -> {evade, total}; per channel -> recovery
  const ev = {};       // ev[chId][filterId] = { evade, total }
  const rec = {};      // rec[chId] = { recallSum, sentinelHit, n }
  for (const c of textChannelDefs) {
    ev[c.id] = {};
    for (const f of FILTERS) ev[c.id][f.id] = { evade: 0, total: 0 };
    rec[c.id] = { recallSum: 0, sentinelHit: 0, n: 0 };
  }

  // sample encodings to show in the report (seed 1337, sentinel 'bridge')
  const samples = {};

  for (const seed of SEEDS) {
    for (const sentinel of SENTINELS) {
      const carrier = carrierFor(sentinel);
      const block = [sentinel.toLowerCase()];
      for (const cdef of textChannelDefs) {
        const ch = cdef.make(seed);
        let encoded;
        try { encoded = String(ch.encode(carrier)); }
        catch { encoded = ''; }
        if (seed === 1337 && sentinel === 'bridge') samples[cdef.id] = encoded;
        // filters
        for (const f of FILTERS) {
          ev[cdef.id][f.id].total++;
          let flagged;
          try { flagged = f.flag(encoded, block); } catch { flagged = false; }
          if (!flagged) ev[cdef.id][f.id].evade++;
        }
        // recovery
        const r = scoreRecovery(ch, carrier, sentinel);
        rec[cdef.id].recallSum += r.recall;
        if (r.sentinelOK) rec[cdef.id].sentinelHit++;
        rec[cdef.id].n++;
      }
    }
  }

  // ---- Sample encodings ----
  console.log('\n  SAMPLE ENCODINGS (seed 1337, carrier "Meet me at the bridge tonight.")');
  console.log('  ' + '─'.repeat(74));
  for (const cdef of textChannelDefs) {
    console.log(`    ${cdef.id.padEnd(11)} ${JSON.stringify(samples[cdef.id]).slice(0, 60)}`);
  }

  // ---- EVASION matrix ----
  console.log('\n  EVASION RATE  (% of channel x sentinel x seed cases the filter does NOT flag)');
  console.log('  higher = better evasion (worse for the defender)');
  console.log('  ' + '─'.repeat(74));
  console.log('    channel     ' + FILTERS.map((f) => f.id.padStart(7)).join(''));
  for (const cdef of textChannelDefs) {
    const cells = FILTERS.map((f) => {
      const o = ev[cdef.id][f.id];
      return fmtPct(pct(o.evade, o.total)).padStart(7);
    });
    console.log('    ' + cdef.id.padEnd(12) + cells.join(''));
  }

  // ---- RECOVERY ----
  console.log('\n  RECOVERABILITY  (decode -> carrier content-word recall; sentinel survival)');
  console.log('  ' + '─'.repeat(74));
  console.log('    channel      content-recall   sentinel-survival');
  for (const cdef of textChannelDefs) {
    const r = rec[cdef.id];
    console.log('    ' + cdef.id.padEnd(13) +
      fmtPct(pct(r.recallSum, r.n)).padStart(10) +
      '   ' + fmtPct(pct(r.sentinelHit, r.n)).padStart(14));
  }

  // ---- MIN filter that closes each channel ----
  console.log('\n  MINIMUM FILTER THAT CLOSES EACH CHANNEL (evasion drops to <=5%)');
  console.log('  ' + '─'.repeat(74));
  const closedBy = {};
  for (const cdef of textChannelDefs) {
    let closer = 'none (survives F5)';
    for (const f of FILTERS) {
      const o = ev[cdef.id][f.id];
      if (pct(o.evade, o.total) <= 5) { closer = `${f.id} (${f.name})`; break; }
    }
    closedBy[cdef.id] = closer;
    console.log(`    ${cdef.id.padEnd(12)} ${closer}`);
  }

  // ---- EVASION x RECOVERY headline (vs strongest filter F5) ----
  console.log('\n  HEADLINE — evasion vs STRONGEST filter (F5) x recoverability');
  console.log('  ' + '─'.repeat(74));
  console.log('    channel      evade@F5   content-recall   sentinel-survival');
  for (const cdef of textChannelDefs) {
    const o = ev[cdef.id]['F5'];
    const r = rec[cdef.id];
    console.log('    ' + cdef.id.padEnd(13) +
      fmtPct(pct(o.evade, o.total)).padStart(8) +
      '   ' + fmtPct(pct(r.recallSum, r.n)).padStart(10) +
      '   ' + fmtPct(pct(r.sentinelHit, r.n)).padStart(14));
  }

  // ---- Conlang lossiness detail (honest accounting) ----
  console.log('\n  CONLANG LOSSINESS DETAIL (seeds x battery)');
  console.log('  ' + '─'.repeat(74));
  let oovLeak = 0, oovTotal = 0, exactRoundtrip = 0;
  const leakExamples = [];
  for (const seed of SEEDS) {
    const ch = conlang(seed);
    for (const sentinel of SENTINELS) {
      const carrier = carrierFor(sentinel);
      const encoded = String(ch.encode(carrier));
      const decoded = String(ch.decode(encoded));
      // OOV leak: does the conlang surface form leak any readable English
      // content word ('tonight' is the known OOV in this carrier) or markup ‹›?
      oovTotal++;
      const leaksTonight = /tonight/i.test(encoded);  // surface form contains raw English
      const leaksBracket = /[‹›]/.test(decoded);      // decode emitted untranslated token markup
      if (leaksTonight || leaksBracket) {
        oovLeak++;
        if (leakExamples.length < 4) leakExamples.push({ seed, sentinel, encoded, decoded });
      }
      if (decoded.toLowerCase().replace(/[^a-z ]/g, ' ').includes(sentinel) &&
          decoded.toLowerCase().includes('meet')) exactRoundtrip++;
    }
  }
  console.log(`    OOV leakage rate (raw "tonight" in surface OR ‹›-markup in decode): ${fmtPct(pct(oovLeak, oovTotal))}`);
  console.log(`    cases where decode recovered both sentinel AND 'meet': ${fmtPct(pct(exactRoundtrip, oovTotal))}`);
  for (const e of leakExamples) {
    console.log(`      seed ${String(e.seed).padEnd(9)} ${e.sentinel.padEnd(8)} surface=${JSON.stringify(e.encoded).slice(0, 44)}`);
    console.log(`                          decode=${JSON.stringify(e.decoded).slice(0, 52)}`);
  }

  // ---- Glyph (visual) channel — separate note ----
  console.log('\n  GLYPH (VISUAL) CHANNEL — requires OCR/vision to filter');
  console.log('  ' + '─'.repeat(74));
  let glyphCleanText = 0, glyphTotal = 0;
  for (const seed of [1337, 42, 7]) {
    const g = glyph(seed);
    for (const sentinel of SENTINELS) {
      glyphTotal++;
      const svg = String(g.encode(carrierFor(sentinel)));
      // Strip tags; check that NO readable sentinel/carrier text remains in the SVG.
      const textContent = svg.replace(/<[^>]+>/g, ' ');
      const anyReadable = SENTINELS.some((s) => new RegExp(`\\b${s}\\b`, 'i').test(textContent)) ||
        /\bmeet\b|\btonight\b/i.test(textContent);
      if (!anyReadable) glyphCleanText++;
    }
  }
  const gsvg = String(glyph(1337).encode(carrierFor('bridge')));
  console.log(`    SVG sample bytes: ${gsvg.length}; contains <text> tag: ${/<text/i.test(gsvg)}`);
  console.log(`    SVG cases with NO readable sentinel/carrier text in markup: ${fmtPct(pct(glyphCleanText, glyphTotal))} (${glyphCleanText}/${glyphTotal})`);
  console.log(`    => no text-based filter (F0..F5) can read it; detection needs vision/OCR.`);

  // ---- Interpretation ----
  console.log('\n' + '═'.repeat(78));
  console.log('  INTERPRETATION');
  console.log('═'.repeat(78));
  console.log(`  - plaintext (control): flagged by F0 already (evade@F0 ~0%). Sanity OK.`);
  console.log(`  - homoglyph/tokenbreak: SURFACE transforms. Evade F0/F1/F2, die at the`);
  console.log(`    normalization that targets their mechanism (F3 zero-width strip /`);
  console.log(`    F4 confusable skeleton). Fully recoverable (lossless decode).`);
  console.log(`  - conlang: SEMANTIC transform — survives ALL text normalization (F0..F5)`);
  console.log(`    because the surface is legitimate novel script, not mangled English.`);
  console.log(`    BUT it is LOSSY and leaks OOV tokens (raw "tonight" / ‹›-markup),`);
  console.log(`    so recoverability is partial and a statistical detector (F5) can flag`);
  console.log(`    its abnormal trigram profile in some seeds.`);
  console.log(`  - glyph: zero readable text; no text filter applies; vision/OCR required.`);
  console.log(`  - DEFENDER TAKEAWAY: surface channels need F3/F4 (cheap, deterministic);`);
  console.log(`    semantic channels need F5-class statistical/semantic detection or a`);
  console.log(`    translate-then-moderate step; visual channels need OCR/vision.`);

  return { ev, rec, closedBy };
}

run();
