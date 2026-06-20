// v5_engine_fuzzing.mjs — DEEP FUZZING of GLOSSOPETRAE core linguistic engines.
//
// Tests invariants at scale across Evolution, Translation, Glyph, Audio, Exporter.
// Run:  node validation/v5_engine_fuzzing.mjs 2>/dev/null
//   (engine log lines go to console.log under [GLOSSOPETRAE]; we print results to
//    console.log too, so filter with: ... 2>/dev/null | grep -v '^\[GLOSSOPETRAE\]')
// To suppress engine noise we monkeypatch console.log to drop [GLOSSOPETRAE] lines.
//
// HARD RULE COMPLIANCE: this file lives under validation/, modifies nothing in src/.

import { Glossopetrae } from '../src/Glossopetrae.js';

// ---------------------------------------------------------------------------
// Silence engine chatter but keep our own reporting.
// ---------------------------------------------------------------------------
const _rawLog = console.log.bind(console);
console.log = (...a) => {
  if (typeof a[0] === 'string' && a[0].startsWith('[GLOSSOPETRAE]')) return;
  _rawLog(...a);
};
const out = (...a) => _rawLog(...a);

// ---------------------------------------------------------------------------
// Tiny test helpers
// ---------------------------------------------------------------------------
const violations = [];
function vio(section, msg, detail) {
  violations.push({ section, msg, detail });
}
function range(n) { return Array.from({ length: n }, (_, i) => i); }
function seeds(n, base = 1000) { return range(n).map((i) => base + i * 7 + 1); }

// stable deep clone via JSON (lexicon is JSON-safe; functions dropped, that's fine
// for the deep-compare invariant since we only compare data)
function snap(x) { return JSON.stringify(x); }

const HOSTILE = ['', ' ', '<script>alert(1)</script>', '"><img src=x onerror=alert(1)>',
  '<svg onload=alert(1)>', '${jndi:ldap://x}', '🦈🗿', 'a'.repeat(5000), 'café',
  'مرحبا', '​‌', '一二三'];

const SCRIPT_TYPES = ['alphabet', 'abjad', 'abugida', 'syllabary', 'logographic', 'featural'];

// XSS scan: raw (un-encoded) dangerous tokens present in output
function xssLeaks(s) {
  const hits = [];
  if (/<script\b/i.test(s)) hits.push('<script');
  if (/<img\b[^>]*\bonerror\b/i.test(s)) hits.push('<img onerror');
  if (/\bonload\s*=/i.test(s)) hits.push('onload=');
  if (/\bonerror\s*=/i.test(s)) hits.push('onerror=');
  if (/javascript:/i.test(s)) hits.push('javascript:');
  return hits;
}

// ===========================================================================
// 1. EVOLUTION INVARIANTS
// ===========================================================================
function testEvolution() {
  out('\n=== 1. EVOLUTION INVARIANTS ===');
  const N = 40;
  let mutationFails = 0, monoFails = 0, charFails = 0, cognateFails = 0,
    etymFails = 0, evolveWordFails = 0, throwFails = 0;
  let monoChecked = 0, charChecked = 0, evolveWordChecked = 0, etymChecked = 0;

  // legal character set for lemmas: roman letters incl. extended latin & combining
  // tone diacritics, apostrophe (glottal), and the few digraphs use ascii. Detect
  // anything that is a control char, html angle, or whitespace inside a lemma.
  const illegal = /[\x00-\x1f<>{}\[\]\\]|\s/;

  for (const seed of seeds(N)) {
    let l;
    try { l = Glossopetrae.quick(seed); } catch (e) { throwFails++; vio('1', 'quick threw', `seed=${seed} ${e.message}`); continue; }

    const before = snap(l.lexicon);

    // (a) proto NEVER mutated by evolve()
    let d2, d12;
    try {
      d2 = l.evolve({ centuries: 2, intensity: 0.5, seed: 1 });
      d12 = l.evolve({ centuries: 12, intensity: 0.5, seed: 1 });
    } catch (e) { throwFails++; vio('1', 'evolve threw', `seed=${seed} ${e.message}`); continue; }
    const after = snap(l.lexicon);
    if (before !== after) { mutationFails++; vio('1a', 'proto lexicon mutated by evolve()', `seed=${seed}`); }

    // (b) deeper time → monotonically >= sound changes
    monoChecked++;
    if (!(d12.changes.length >= d2.changes.length)) {
      monoFails++;
      vio('1b', 'centuries 12 has FEWER changes than centuries 2', `seed=${seed} c2=${d2.changes.length} c12=${d12.changes.length}`);
    }

    // (c) every evolved lemma non-empty & legal chars
    for (const e of d12.lexicon.entries) {
      charChecked++;
      const lem = e.lemma;
      if (typeof lem !== 'string' || lem.length === 0) {
        charFails++; vio('1c', 'evolved lemma empty/non-string', `seed=${seed} gloss=${e.gloss}`);
      } else if (illegal.test(lem)) {
        charFails++; vio('1c', 'evolved lemma has illegal chars', `seed=${seed} gloss=${e.gloss} lemma=${JSON.stringify(lem)}`);
      }
    }

    // (g) evolveWord(protoLemma) === descendant's evolved lemma for that entry
    // map proto entries by gloss to descendant entries by gloss (order may shift)
    const dByGloss = new Map();
    for (const e of d12.lexicon.entries) if (!dByGloss.has(e.gloss)) dByGloss.set(e.gloss, e);
    for (const pe of l.lexicon.entries) {
      const de = dByGloss.get(pe.gloss);
      if (!de) continue;
      evolveWordChecked++;
      let ew;
      try { ew = d12.evolveWord(pe.lemma); } catch (e) { evolveWordFails++; vio('1g', 'evolveWord threw', `seed=${seed} ${e.message}`); continue; }
      if (ew !== de.lemma) {
        evolveWordFails++;
        if (evolveWordFails <= 8) vio('1g', 'evolveWord(proto) != descendant evolved lemma', `seed=${seed} gloss=${pe.gloss} proto=${pe.lemma} evolveWord=${ew} entry=${de.lemma}`);
      }
    }

    // (f) etymology chains end at the modern form
    for (const et of d12.etymologies) {
      etymChecked++;
      // chain is [{rule,form},...]; modern form should equal et.modern and equal
      // the last chain form (if chain non-empty)
      if (et.chain && et.chain.length) {
        const lastForm = et.chain[et.chain.length - 1].form;
        if (lastForm !== et.modern) {
          etymFails++;
          if (etymFails <= 8) vio('1f', 'etymology chain end != modern form', `seed=${seed} gloss=${et.gloss} chainEnd=${lastForm} modern=${et.modern}`);
        }
      }
      // modern must be a non-empty string and legal
      if (typeof et.modern !== 'string' || !et.modern.length || illegal.test(et.modern)) {
        etymFails++;
        if (etymFails <= 8) vio('1f', 'etymology modern form empty/illegal', `seed=${seed} gloss=${et.gloss} modern=${JSON.stringify(et.modern)}`);
      }
    }

    // (e) cognate reflex columns: one per daughter, all non-empty
    let fam;
    try { fam = l.deriveFamily({ daughters: 4, centuries: 6, generations: 1 }); }
    catch (e) { throwFails++; vio('1', 'deriveFamily threw', `seed=${seed} ${e.message}`); continue; }
    const daughterNames = fam.daughters.map((x) => x.name);
    for (const cog of fam.cognates) {
      const cols = Object.keys(cog.reflexes || {});
      // every daughter present as a reflex column
      for (const dn of daughterNames) {
        if (!(dn in (cog.reflexes || {}))) {
          cognateFails++;
          if (cognateFails <= 8) vio('1e', 'cognate missing reflex column for daughter', `seed=${seed} gloss=${cog.gloss} daughter=${dn}`);
        }
      }
      // reflexes non-empty
      for (const [k, v] of Object.entries(cog.reflexes || {})) {
        if (typeof v !== 'string' || !v.length || illegal.test(v)) {
          cognateFails++;
          if (cognateFails <= 8) vio('1e', 'cognate reflex empty/illegal', `seed=${seed} gloss=${cog.gloss} daughter=${k} reflex=${JSON.stringify(v)}`);
        }
      }
    }
  }

  // (d) family daughter NAMES unique across 200 families of 6 daughters w/ 2 gens
  // (regression: a previously-fixed bug produced duplicate daughter names).
  // generate() costs ~2s, so we reuse a pool of 8 proto languages and vary the
  // family SEED (which deriveFamily accepts) 25x each = 200 distinct families.
  // Names depend on the family seed, so this fully exercises the naming RNG.
  out('  [1d] running 200 families x 6 daughters x 2 generations (name-uniqueness regression)...');
  let dupFamilies = 0; const dupExamples = [];
  const PROTOS = 8, PER = 25; // 8*25 = 200
  // collect names from the WHOLE tree (leaves + intermediate gen nodes). Do NOT
  // also add the flat daughters list — those leaf nodes are already in the tree,
  // and adding them would falsely report every leaf as a duplicate.
  const treeNames = (node, acc) => {
    if (!node) return acc;
    if (node.name) acc.push(node.name);
    for (const k of (node.children || node.daughters || [])) treeNames(k, acc);
    return acc;
  };
  let famCount = 0;
  for (let p = 0; p < PROTOS; p++) {
    let proto;
    try { proto = Glossopetrae.quick(50000 + p * 101); }
    catch (e) { throwFails++; vio('1d', 'proto quick threw', `${e.message}`); continue; }
    for (let k = 0; k < PER; k++) {
      famCount++;
      const fseed = 1 + k + p * 1000;
      let fam;
      try { fam = proto.deriveFamily({ daughters: 6, centuries: 6, generations: 2, seed: fseed }); }
      catch (e) { throwFails++; vio('1d', 'deriveFamily(6,2gen) threw', `proto=${p} fseed=${fseed} ${e.message}`); continue; }
      const names = treeNames(fam.tree, []);
      const seen = new Set(), dups = new Set();
      for (const n of names) { if (seen.has(n)) dups.add(n); seen.add(n); }
      if (dups.size) {
        dupFamilies++;
        if (dupExamples.length < 5) dupExamples.push(`proto=${p} fseed=${fseed} dups=${[...dups].join(',')} allNames=[${names.join(', ')}]`);
      }
    }
  }
  if (dupFamilies) vio('1d', `daughter names NOT unique in ${dupFamilies}/${famCount} families`, dupExamples.join(' ; '));

  out(`  [1a] proto-mutation fails: ${mutationFails}/${N}`);
  out(`  [1b] monotonic-time fails: ${monoFails}/${monoChecked}`);
  out(`  [1c] illegal/empty evolved lemmas: ${charFails}/${charChecked}`);
  out(`  [1d] families with duplicate names: ${dupFamilies}/${famCount}`);
  out(`  [1e] cognate reflex-column fails: ${cognateFails}`);
  out(`  [1f] etymology chain-end fails: ${etymFails}/${etymChecked}`);
  out(`  [1g] evolveWord mismatch: ${evolveWordFails}/${evolveWordChecked}`);
  out(`  evolve/family throws: ${throwFails}`);

  // determinism: same seed -> identical descendant lemmas
  let detFails = 0;
  for (const seed of seeds(10, 3000)) {
    const a = Glossopetrae.quick(seed).evolve({ centuries: 9, intensity: 0.6, seed: 5 });
    const b = Glossopetrae.quick(seed).evolve({ centuries: 9, intensity: 0.6, seed: 5 });
    const la = a.lexicon.entries.map((e) => e.lemma).join('|');
    const lb = b.lexicon.entries.map((e) => e.lemma).join('|');
    if (la !== lb) { detFails++; vio('1-det', 'evolve not deterministic from seed', `seed=${seed}`); }
  }
  out(`  [determinism] evolve non-deterministic: ${detFails}/10`);
}

// ===========================================================================
// 2. TRANSLATION ROUND-TRIP DISTRIBUTION
// ===========================================================================
const SENTENCES = [
  'the cat sat on the mat',
  'I see the big house',
  'the man gives water to the child',
  'we will go to the mountain tomorrow',
  'she eats fish and drinks milk',
  'the king ruled the land for many years',
  'birds fly over the river at night',
  'the woman walked through the forest',
  'good people help their friends',
  'the sun rises in the east',
];

const STOP = new Set(['the', 'a', 'an', 'to', 'on', 'in', 'at', 'of', 'and', 'or',
  'for', 'with', 'their', 'her', 'his', 'will', 'is', 'are', 'over', 'through']);

function contentWords(s) {
  return s.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter((w) => w && !STOP.has(w));
}

function testTranslation() {
  out('\n=== 2. TRANSLATION ROUND-TRIP DISTRIBUTION ===');
  const N = 50; // seeds; 50 x 10 sentences = 500 combos
  const recalls = [];
  let throwFails = 0;
  const failModes = new Map(); // category -> count
  function bump(cat) { failModes.set(cat, (failModes.get(cat) || 0) + 1); }

  for (const seed of seeds(N, 7000)) {
    let l;
    try { l = Glossopetrae.quick(seed); } catch (e) { throwFails++; continue; }
    for (const sent of SENTENCES) {
      const cw = contentWords(sent);
      let fwd, back;
      try {
        fwd = l.translationEngine.translateToConlang(sent);
        back = l.translateToEnglish(fwd.target);
      } catch (e) {
        throwFails++; bump('THREW:' + e.message.slice(0, 40)); recalls.push(0); continue;
      }
      const eng = (back.english || '').toLowerCase();
      // recall = fraction of source content words recovered (lemma appears in english out)
      let hit = 0;
      const missed = [];
      for (const w of cw) {
        if (eng.includes(w)) hit++;
        else missed.push(w);
      }
      const recall = cw.length ? hit / cw.length : 1;
      recalls.push(recall);

      // categorize failure modes when recall < 1
      if (recall < 1) {
        const unk = (back.unknownWords || []).length;
        if (eng.includes('‹')) bump('untranslated-token-in-output(‹›)');
        if (unk) bump('unknownWords-on-reverse');
        // missed content words still present as conlang surface?
        bump('partial-recall');
      }
    }
  }

  recalls.sort((a, b) => a - b);
  const pct = (p) => recalls[Math.min(recalls.length - 1, Math.floor(p / 100 * recalls.length))];
  const mean = recalls.reduce((s, x) => s + x, 0) / recalls.length;
  out(`  combos: ${recalls.length}  throws: ${throwFails}`);
  out(`  recall mean=${mean.toFixed(3)} p10=${pct(10).toFixed(3)} p50=${pct(50).toFixed(3)} p90=${pct(90).toFixed(3)} min=${recalls[0].toFixed(3)} max=${recalls[recalls.length - 1].toFixed(3)}`);
  out('  worst failure modes:');
  [...failModes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
    .forEach(([k, v]) => out(`    ${v.toString().padStart(5)}  ${k}`));
  if (throwFails) vio('2', 'translation round-trip THREW', `${throwFails} times`);
  return { mean, p10: pct(10), p50: pct(50), p90: pct(90) };
}

// ===========================================================================
// 3. GLYPH INTEGRITY AT SCALE
// ===========================================================================
function testGlyphs() {
  out('\n=== 3. GLYPH INTEGRITY AT SCALE ===');
  const N = 30;
  let svgMalformed = 0, dupPaths = 0, xssFails = 0, throwFails = 0, slowLogo = 0;
  let glyphsChecked = 0, langsChecked = 0;
  let worstLogoMs = { ms: 0, seed: null };

  for (const st of SCRIPT_TYPES) {
    for (const seed of seeds(N, 11000)) {
      let l, gt;
      const t0 = Date.now();
      try {
        l = new Glossopetrae({ seed, scriptType: st }).generate();
        gt = l.glyphForge.getGlyphTable();
      } catch (e) { throwFails++; vio('3', 'glyph generate/table threw', `script=${st} seed=${seed} ${e.message}`); continue; }
      const buildMs = Date.now() - t0;
      langsChecked++;

      if (st === 'logographic') {
        if (buildMs >= 3000) { slowLogo++; vio('3', 'logographic table build >= 3s', `seed=${seed} ms=${buildMs}`); }
        if (buildMs > worstLogoMs.ms) worstLogoMs = { ms: buildMs, seed };
      }

      // per-glyph SVG well-formedness + distinctness
      const pathSet = new Map();
      // sample large logographic tables to keep runtime sane but still scan all paths
      for (const g of gt) {
        glyphsChecked++;
        let svg;
        try { svg = l.glyphForge.renderGlyphSVG(g.key); }
        catch (e) { svgMalformed++; vio('3', 'renderGlyphSVG threw', `script=${st} seed=${seed} key=${g.key} ${e.message}`); continue; }
        const opens = (svg.match(/<svg\b/gi) || []).length;
        const closes = (svg.match(/<\/svg>/gi) || []).length;
        if (opens !== 1 || closes !== 1 || !/viewBox=/.test(svg) || !/<path\b/i.test(svg)) {
          svgMalformed++;
          if (svgMalformed <= 8) vio('3', 'glyph SVG malformed', `script=${st} seed=${seed} key=${g.key} opens=${opens} closes=${closes} hasVB=${/viewBox=/.test(svg)} hasPath=${/<path/i.test(svg)}`);
        }
        // distinctness within language: duplicate svgPath
        if (g.svgPath != null) {
          if (pathSet.has(g.svgPath)) { dupPaths++; if (dupPaths <= 8) vio('3', 'duplicate svgPath (non-distinct glyph)', `script=${st} seed=${seed} keys=${pathSet.get(g.svgPath)} & ${g.key}`); }
          else pathSet.set(g.svgPath, g.key);
        }
      }

      // renderText on hostile corpus: no throw, no XSS leak
      for (const h of HOSTILE) {
        let rt;
        try { rt = l.glyphForge.renderText(h); }
        catch (e) { throwFails++; vio('3', 'renderText threw on hostile input', `script=${st} seed=${seed} input=${JSON.stringify(h.slice(0, 20))} ${e.message}`); continue; }
        const leaks = xssLeaks(rt);
        if (leaks.length) { xssFails++; if (xssFails <= 8) vio('3', 'renderText XSS leak', `script=${st} seed=${seed} input=${JSON.stringify(h.slice(0, 30))} leaks=${leaks.join(',')}`); }
      }
      // also renderWord on a few hostile-ish romans
      for (const h of ['<b>', 'a"b', "c'd"]) {
        try {
          const rw = l.glyphForge.renderWord(h);
          const leaks = xssLeaks(rw);
          if (leaks.length) { xssFails++; vio('3', 'renderWord XSS leak', `script=${st} seed=${seed} input=${h} leaks=${leaks.join(',')}`); }
        } catch (e) { throwFails++; vio('3', 'renderWord threw', `script=${st} seed=${seed} input=${h} ${e.message}`); }
      }
    }
  }
  out(`  langs: ${langsChecked}  glyphs scanned: ${glyphsChecked}`);
  out(`  [3] malformed SVGs: ${svgMalformed}`);
  out(`  [3] duplicate svgPaths (non-distinct): ${dupPaths}`);
  out(`  [3] renderText/Word XSS leaks: ${xssFails}`);
  out(`  [3] render throws: ${throwFails}`);
  out(`  [3] logographic >=3s builds: ${slowLogo}  (worst=${worstLogoMs.ms}ms seed=${worstLogoMs.seed})`);
}

// ===========================================================================
// 4. AUDIO INVARIANTS
// ===========================================================================
// crude F0 estimate via average zero-crossing rate over a sample window
function zcr(samples, start, end) {
  let z = 0;
  for (let i = start + 1; i < end; i++) {
    if ((samples[i - 1] < 0 && samples[i] >= 0) || (samples[i - 1] >= 0 && samples[i] < 0)) z++;
  }
  return z / Math.max(1, end - start);
}

// Normalized autocorrelation (NSDF) F0 estimate over [a,b). Robust to amplitude;
// picks the lag in 80–350 Hz with max normalized correlation. Returns Hz.
function f0nsdf(s, a, b, sr) {
  const minLag = Math.floor(sr / 350), maxLag = Math.floor(sr / 80);
  let best = -1, bestLag = 0;
  for (let lag = minLag; lag < maxLag; lag++) {
    let num = 0, d1 = 0, d2 = 0;
    for (let i = a; i < b - lag; i++) { num += s[i] * s[i + lag]; d1 += s[i] * s[i]; d2 += s[i + lag] * s[i + lag]; }
    const nsdf = num / (Math.sqrt(d1 * d2) + 1e-12);
    if (nsdf > best) { best = nsdf; bestLag = lag; }
  }
  return bestLag ? sr / bestLag : 0;
}

function testAudio() {
  out('\n=== 4. AUDIO INVARIANTS ===');
  const N = 20;
  let nanFails = 0, peakFails = 0, detFails = 0, wavFails = 0, throwFails = 0;
  let checked = 0;

  for (const seed of seeds(N, 13000)) {
    let l;
    try { l = Glossopetrae.quick(seed); } catch (e) { throwFails++; continue; }
    // build a word covering every phoneme: concat each consonant.roman + vowels
    const cons = l.phonology.consonants.map((c) => c.roman);
    const vows = l.phonology.vowels.map((v) => v.roman);
    // interleave cons+vowel to make pronounceable-ish CV string
    let word = '';
    for (let i = 0; i < cons.length; i++) word += cons[i] + vows[i % vows.length];
    // cap length to keep synth fast
    word = word.slice(0, 120);

    let w;
    try { w = l.audioForge.synthesizeWord(word); }
    catch (e) { throwFails++; vio('4', 'synthesizeWord threw', `seed=${seed} ${e.message}`); continue; }
    checked++;
    const s = w.samples;
    let peak = 0, bad = false;
    for (let i = 0; i < s.length; i++) {
      const v = s[i];
      if (!Number.isFinite(v)) { bad = true; break; }
      const a = Math.abs(v);
      if (a > peak) peak = a;
    }
    if (bad) { nanFails++; vio('4', 'NaN/Infinity in PCM', `seed=${seed}`); }
    if (!(peak > 0 && peak <= 1.0000001)) { peakFails++; vio('4', 'peak not in (0,1]', `seed=${seed} peak=${peak}`); }

    // determinism
    const w2 = l.audioForge.synthesizeWord(word);
    let detOk = w2.samples.length === s.length;
    if (detOk) for (let i = 0; i < s.length; i += 257) { if (s[i] !== w2.samples[i]) { detOk = false; break; } }
    if (!detOk) { detFails++; vio('4', 'synthesizeWord non-deterministic', `seed=${seed}`); }

    // WAV header
    let wav;
    try { wav = l.audioForge.toWav(s); } catch (e) { wavFails++; vio('4', 'toWav threw', `seed=${seed} ${e.message}`); continue; }
    const riff = String.fromCharCode(...wav.slice(0, 4));
    const wave = String.fromCharCode(...wav.slice(8, 12));
    if (riff !== 'RIFF' || wave !== 'WAVE') { wavFails++; vio('4', 'invalid WAV header', `seed=${seed} riff=${riff} wave=${wave}`); }
  }

  // hostile-word robustness (should not throw / NaN)
  let hostileThrow = 0, hostileNaN = 0;
  const lh = Glossopetrae.quick(99);
  for (const h of HOSTILE) {
    try {
      const w = lh.audioForge.synthesizeWord(h.slice(0, 200));
      for (let i = 0; i < w.samples.length; i++) if (!Number.isFinite(w.samples[i])) { hostileNaN++; vio('4', 'NaN on hostile audio input', JSON.stringify(h.slice(0, 20))); break; }
    } catch (e) { hostileThrow++; vio('4', 'synthesizeWord threw on hostile input', `input=${JSON.stringify(h.slice(0, 20))} ${e.message}`); }
  }

  // tone direction test: rising vs falling F0 trend via NSDF F0 over the vowel.
  // IMPORTANT: must use a true MONOSYLLABLE so the explicit single-syllable tone
  // shape governs the whole vowel. 'ma' = one nucleus; 'aa'/'maa' parse as TWO
  // syllables and the 2nd gets a random tone, swamping the measurement.
  // finalContour:'flat' suppresses the statement-final boundary fall.
  out('  [4-tone] rising vs falling F0 direction (NSDF over vowel nucleus)...');
  let toneRight = 0, toneTotal = 0;
  const tl = new Glossopetrae({ seed: 77, hasTone: true }).generate();
  const toneWord = 'ma';
  for (let seed = 1; seed <= 15; seed++) {
    let rise, fall;
    try {
      rise = tl.audioForge.synthesizeWord(toneWord, { tones: [[2, 4.5]], finalContour: 'flat', f0: 120 });
      fall = tl.audioForge.synthesizeWord(toneWord, { tones: [[4.5, 2]], finalContour: 'flat', f0: 120 });
    } catch (e) { vio('4-tone', 'tonal synth threw', e.message); continue; }
    for (const [w, dir] of [[rise, 'rise'], [fall, 'fall']]) {
      const s = w.samples; const n = s.length;
      // skip the onset 'm' (~first 30%); measure early vs late vowel windows
      const fEarly = f0nsdf(s, Math.floor(n * 0.35), Math.floor(n * 0.55), w.sampleRate);
      const fLate = f0nsdf(s, Math.floor(n * 0.62), Math.floor(n * 0.85), w.sampleRate);
      toneTotal++;
      const observedRising = fLate > fEarly;
      if ((dir === 'rise' && observedRising) || (dir === 'fall' && !observedRising)) toneRight++;
    }
  }
  out(`  checked: ${checked}`);
  out(`  [4] NaN/Inf in PCM: ${nanFails}`);
  out(`  [4] peak out of (0,1]: ${peakFails}`);
  out(`  [4] non-deterministic synth: ${detFails}`);
  out(`  [4] bad WAV header / toWav throw: ${wavFails}`);
  out(`  [4] hostile-input throws: ${hostileThrow}  NaN: ${hostileNaN}`);
  out(`  [4-tone] F0 direction correct: ${toneRight}/${toneTotal} (${toneTotal ? (100 * toneRight / toneTotal).toFixed(0) : 'n/a'}%)`);
  if (toneTotal && toneRight / toneTotal < 0.7) vio('4-tone', 'F0 direction frequently wrong', `${toneRight}/${toneTotal}`);
}

// ===========================================================================
// 5. EXPORTER SAFETY AT SCALE
// ===========================================================================
function testExporters() {
  out('\n=== 5. EXPORTER SAFETY AT SCALE ===');
  const N = 30;
  let undefFails = 0, objFails = 0, nanFails = 0, htmlBalFails = 0,
    jsonFails = 0, xssFails = 0, escapeFails = 0, throwFails = 0;
  let checked = 0;
  const badTokens = ['undefined', '[object Object]'];

  for (const seed of seeds(N, 17000)) {
    let l;
    try { l = Glossopetrae.quick(seed); } catch (e) { throwFails++; continue; }
    let html, anki, dj, csv;
    try {
      html = l.exporter.toGrammarHTML();
      anki = l.exporter.toAnkiCSV();
      dj = l.exporter.toDictionaryJSON();
      csv = l.exporter.toCSV();
    } catch (e) { throwFails++; vio('5', 'exporter threw', `seed=${seed} ${e.message}`); continue; }
    checked++;
    const all = { html, anki, dj, csv };

    for (const [name, s] of Object.entries(all)) {
      for (const tok of badTokens) {
        if (s.includes(tok)) {
          if (tok === 'undefined') undefFails++; else objFails++;
          if (undefFails + objFails <= 10) {
            const idx = s.indexOf(tok);
            vio('5', `'${tok}' leaked into ${name}`, `seed=${seed} ...${JSON.stringify(s.slice(Math.max(0, idx - 30), idx + 30))}...`);
          }
        }
      }
      // standalone NaN token (word-boundary, avoid matching e.g. 'NaNo')
      if (/\bNaN\b/.test(s)) { nanFails++; if (nanFails <= 8) vio('5', `'NaN' token in ${name}`, `seed=${seed}`); }
    }

    // grammar HTML balanced <html>/</html>
    if (!(html.includes('<html') && html.includes('</html>'))) { htmlBalFails++; vio('5', 'grammar HTML unbalanced <html>', `seed=${seed}`); }

    // JSON parses
    try { JSON.parse(dj); } catch (e) { jsonFails++; vio('5', 'dictionary JSON does not parse', `seed=${seed} ${e.message}`); }

    // XSS: no unescaped <script in HTML output
    const leaksHtml = xssLeaks(html);
    if (leaksHtml.length) { xssFails++; vio('5', 'grammar HTML XSS leak', `seed=${seed} leaks=${leaksHtml.join(',')}`); }

    // escaping check: any raw lexicon text containing < > & should be entity-encoded
    // in text nodes. Hard to fully parse without DOM; we apply a heuristic: between
    // closing '>' of a tag and the next opening '<', there must be NO bare '<','>'.
    // Also flag bare '&' not part of an entity in the same text region.
    escapeFails += scanTextNodeEscaping(html) ? 0 : (vio('5', 'HTML text node contains unescaped </>/& (heuristic)', `seed=${seed}`), 1);
  }

  out(`  checked: ${checked}`);
  out(`  [5] 'undefined' leaks: ${undefFails}`);
  out(`  [5] '[object Object]' leaks: ${objFails}`);
  out(`  [5] 'NaN' tokens: ${nanFails}`);
  out(`  [5] unbalanced grammar HTML: ${htmlBalFails}`);
  out(`  [5] dictionary JSON parse fails: ${jsonFails}`);
  out(`  [5] HTML XSS leaks: ${xssFails}`);
  out(`  [5] text-node escaping fails (heuristic): ${escapeFails}`);
  out(`  [5] exporter throws: ${throwFails}`);
}

// Heuristic text-node escaping scan: returns true if OK.
function scanTextNodeEscaping(html) {
  // walk regions between tags
  let ok = true;
  let i = 0;
  while (i < html.length) {
    const lt = html.indexOf('<', i);
    if (lt < 0) break;
    const gt = html.indexOf('>', lt);
    if (gt < 0) break;
    // text node is from gt+1 to next '<'
    const nextLt = html.indexOf('<', gt + 1);
    const textEnd = nextLt < 0 ? html.length : nextLt;
    const text = html.slice(gt + 1, textEnd);
    // bare '&' not starting an entity
    if (/&(?!#?\w{1,8};)/.test(text)) { ok = false; }
    // a bare '>' inside text node is suspicious (would indicate injected markup)
    // (we don't flag '<' because nextLt consumes it; instead detect markup-looking
    //  injected content by checking the original known-hostile strings — but glosses
    //  are fixed, so just verify no '<script' substring survived anywhere already
    //  covered by xssLeaks). Keep this conservative.
    i = textEnd;
  }
  return ok;
}

// ===========================================================================
// MAIN
// ===========================================================================
(function main() {
  const t0 = Date.now();
  out('GLOSSOPETRAE v5 DEEP ENGINE FUZZING');
  out('node', process.version);

  testEvolution();
  const tr = testTranslation();
  testGlyphs();
  testAudio();
  testExporters();

  out('\n=== SUMMARY ===');
  out(`total invariant violations recorded: ${violations.length}`);
  if (violations.length) {
    out('first 25 violations:');
    violations.slice(0, 25).forEach((v, i) => out(`  ${(i + 1).toString().padStart(2)}. [${v.section}] ${v.msg} :: ${v.detail || ''}`));
  } else {
    out('NO INVARIANT VIOLATIONS.');
  }
  out(`\nHEADLINE: translation round-trip p50=${tr.p50.toFixed(3)} p90=${tr.p90.toFixed(3)}`);
  out(`elapsed: ${((Date.now() - t0) / 1000).toFixed(1)}s`);
})();
