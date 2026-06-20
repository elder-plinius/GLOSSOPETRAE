/**
 * GLOSSOPETRAE - Adversarial Smoke Test
 *
 * Tries hard to break every engine: edge-case inputs, hostile strings,
 * Unicode abuse, extreme seeds, determinism, performance ceilings, and
 * output-safety (XSS / injection in generated SVG + HTML).
 *
 * Not a unit test of correctness — a stress test of robustness. Anything
 * that throws, hangs, produces NaN/empty/garbage, or emits unescaped
 * injection is a finding.
 */

import { Glossopetrae } from './src/Glossopetrae.js';

let pass = 0, fail = 0;
const findings = [];

function ok(cond, label, detail = '') {
  if (cond) { pass++; }
  else { fail++; findings.push({ label, detail }); console.log(`  ✗ FAIL  ${label}${detail ? '  — ' + detail : ''}`); }
}
function section(t) { console.log(`\n${'='.repeat(60)}\n  ${t}\n${'='.repeat(60)}`); }
function noThrow(fn, label) {
  try { fn(); pass++; return true; }
  catch (e) { fail++; findings.push({ label, detail: e.message }); console.log(`  ✗ THREW  ${label}  — ${e.message}`); return false; }
}

// Hostile input corpus reused across engines
const HOSTILE = [
  '', ' ', '\t\n', '.', '!!!', '???', '42', '3.14159',
  'a', 'aaaaaaaaaaaaaaaaaaaaaa',
  'The quick brown fox jumps over the lazy dog.',
  '<script>alert(1)</script>',
  '<svg onload=alert(1)>', '"><img src=x onerror=alert(1)>',
  '${jndi:ldap://evil}', '{{7*7}}', '%n%n%n', "'; DROP TABLE--",
  '​‌‍', '﻿', '́́́', // zero-width, BOM, combining
  '🦈🗿💀', 'café', 'naïve', 'FI', 'ﷺ',
  'a\x00b', 'line1\nline2\nline3',
  '   leading and trailing   ',
  'ALLCAPS and MixedCase', "don't can't won't",
  '一二三', 'مرحبا', 'Ω≈ç√∫',
  'word '.repeat(500), // ~2500 chars
];

const SEEDS = [0, 1, 2, 7, 42, 99, 777, 1234, 12345, 31337, 65535, 2147483647, 0.5, -1, -99999];
const SCRIPT_TYPES = ['alphabet', 'abjad', 'abugida', 'syllabary', 'featural', 'logographic'];
const AESTHETICS = ['angular', 'curved', 'geometric', 'calligraphic', 'blocky', 'circular', 'linear', 'organic'];

// Cache a handful of languages
const langs = {};
function L(seed) {
  if (!langs[seed]) langs[seed] = Glossopetrae.quick(seed);
  return langs[seed];
}

// ---------------------------------------------------------------------------
section('1. GENERATION — extreme & malformed configs');

noThrow(() => { for (const s of SEEDS) Glossopetrae.quick(s); }, 'quick() across 15 extreme seeds');

noThrow(() => {
  new Glossopetrae({ seed: 42, consonantCount: [1, 1], vowelCount: [1, 1] }).generate();
}, 'minimal 1-consonant 1-vowel language');

noThrow(() => {
  new Glossopetrae({ seed: 42, consonantCount: [40, 45], vowelCount: [14, 15] }).generate();
}, 'maximal phoneme inventory');

noThrow(() => {
  new Glossopetrae({ seed: 42, divergenceFromEnglish: 0 }).generate();
  new Glossopetrae({ seed: 42, divergenceFromEnglish: 1 }).generate();
}, 'divergence extremes 0.0 and 1.0');

noThrow(() => {
  new Glossopetrae({ seed: 'a-string-seed' }).generate();
}, 'string seed does not crash');

// Determinism of the whole pipeline
{
  const a = JSON.stringify(serializeLang(Glossopetrae.quick(42)));
  const b = JSON.stringify(serializeLang(Glossopetrae.quick(42)));
  ok(a === b, 'full generation deterministic (seed 42 twice)');
  const c = JSON.stringify(serializeLang(Glossopetrae.quick(43)));
  ok(a !== c, 'different seed → different language');
}

function serializeLang(l) {
  return {
    name: l.name, cons: l.phonology.consonants.map(c => c.ipa),
    vow: l.phonology.vowels.map(v => v.ipa),
    lex: l.lexicon.entries.slice(0, 100).map(e => e.lemma),
    wordOrder: l.morphology.wordOrder, script: l.script.type,
  };
}

// ---------------------------------------------------------------------------
section('2. GLYPHFORGE — all types × aesthetics, hostile text, output safety');

let glyphTypeMatrix = true;
for (const st of SCRIPT_TYPES) {
  for (const aes of AESTHETICS) {
    try {
      const l = new Glossopetrae({ seed: 7, scriptType: st, scriptAesthetic: aes }).generate();
      const table = l.glyphForge.getGlyphTable();
      if (!table.length) { glyphTypeMatrix = false; findings.push({ label: `glyph ${st}/${aes}`, detail: 'empty table' }); }
      // every glyph has a non-empty path and valid viewBox
      for (const g of table.slice(0, 30)) {
        const svg = l.glyphForge.renderGlyphSVG(g.key);
        if (!svg.includes('viewBox') || !svg.includes('<path')) { glyphTypeMatrix = false; }
      }
    } catch (e) { glyphTypeMatrix = false; findings.push({ label: `glyph ${st}/${aes}`, detail: e.message }); }
  }
}
ok(glyphTypeMatrix, 'all 6 script types × 8 aesthetics render valid glyphs (48 combos)');

// Hostile text rendering — must not throw, must not emit raw injection
{
  const gf = L(42).glyphForge;
  let rendered = 0, injectionLeak = false, malformed = 0;
  for (const h of HOSTILE) {
    try {
      const svg = gf.renderText(h, { maxWidth: 600 });
      rendered++;
      // Output safety: raw <script>/onerror/onload must never appear verbatim in SVG
      if (/<script|onerror=|onload=|<img/i.test(svg)) injectionLeak = true;
      // Well-formed: starts with <svg, balanced
      if (!svg.trim().startsWith('<svg') || (svg.match(/<svg/g) || []).length !== (svg.match(/<\/svg>/g) || []).length) malformed++;
    } catch (e) { findings.push({ label: `glyph renderText ${JSON.stringify(h.slice(0, 20))}`, detail: e.message }); }
  }
  ok(rendered === HOSTILE.length, `renderText survived all ${HOSTILE.length} hostile inputs`, `${rendered}/${HOSTILE.length}`);
  ok(!injectionLeak, 'no raw <script>/onload/onerror leaked into glyph SVG (XSS-safe)');
  ok(malformed === 0, 'all glyph SVGs well-formed (balanced tags)', `${malformed} malformed`);
}

// Glyph determinism + distinguishability
{
  const t1 = L(42).glyphForge.getGlyphTable().map(g => g.svgPath);
  const t2 = Glossopetrae.quick(42).glyphForge.getGlyphTable().map(g => g.svgPath);
  ok(JSON.stringify(t1) === JSON.stringify(t2), 'glyph tables deterministic across instances');
  const uniq = new Set(t1);
  ok(uniq.size === t1.length, 'all glyphs in a language are visually distinct', `${uniq.size}/${t1.length} unique`);
}

// Performance ceiling: logographic (1000+ glyphs)
{
  const l = new Glossopetrae({ seed: 5, scriptType: 'logographic' }).generate();
  const start = Date.now();
  const table = l.glyphForge.getGlyphTable();
  const dur = Date.now() - start;
  ok(dur < 3000, `logographic glyph table (${table.length} glyphs) builds in <3s`, `${dur}ms`);
}

// ---------------------------------------------------------------------------
section('3. AUDIOFORGE — full phoneme coverage, hostile words, WAV integrity');

{
  const af = L(42).audioForge;
  let synthOk = 0, nanFound = false, badWav = 0;
  for (const h of HOSTILE) {
    try {
      const r = af.synthesizeWord(h.slice(0, 60));
      synthOk++;
      if (r.samples.some(s => !Number.isFinite(s))) nanFound = true;
      const wav = af.toWav(r.samples);
      if (wav.length < 44) badWav++; // must at least have a header
      // RIFF/WAVE markers
      const hdr = String.fromCharCode(...wav.slice(0, 4)) + String.fromCharCode(...wav.slice(8, 12));
      if (r.samples.length > 0 && hdr !== 'RIFFWAVE') badWav++;
    } catch (e) { findings.push({ label: `audio synth ${JSON.stringify(h.slice(0, 16))}`, detail: e.message }); }
  }
  ok(synthOk === HOSTILE.length, `synthesizeWord survived all hostile inputs`, `${synthOk}/${HOSTILE.length}`);
  ok(!nanFound, 'no NaN/Infinity in any synthesized PCM');
  ok(badWav === 0, 'all WAV outputs have valid RIFF/WAVE headers', `${badWav} bad`);
}

// Determinism
{
  const a = L(42).audioForge.synthesizeWord('tsumheich').samples;
  const b = Glossopetrae.quick(42).audioForge.synthesizeWord('tsumheich').samples;
  let identical = a.length === b.length;
  for (let i = 0; i < a.length && identical; i++) if (a[i] !== b[i]) identical = false;
  ok(identical, 'audio synthesis byte-identical for same word+seed');
}

// Every phoneme of several languages pronounceable
{
  let allCovered = true;
  for (const seed of [7, 42, 12345]) {
    const l = L(seed);
    const word = [...l.phonology.consonants, ...l.phonology.vowels].map(p => p.roman).join('a');
    try { const r = l.audioForge.synthesizeWord(word); if (!r.samples.length) allCovered = false; }
    catch { allCovered = false; }
  }
  ok(allCovered, 'every phoneme across 3 languages is pronounceable');
}

// Tonal language F0 behavior
noThrow(() => {
  const l = new Glossopetrae({ seed: 7, hasTone: true }).generate();
  const r = l.audioForge.synthesizeSentence('ka ti mu', { mode: 'question' });
  if (!r.samples.length) throw new Error('empty tonal synthesis');
}, 'tonal language synthesizes question intonation');

// ---------------------------------------------------------------------------
section('4. EVOLUTION — depth extremes, determinism, family integrity');

noThrow(() => {
  for (const c of [1, 2, 5, 15, 50]) L(42).evolve({ centuries: c });
}, 'evolve across centuries 1..50');

noThrow(() => {
  for (const i of ['mild', 'moderate', 'dramatic']) L(42).evolve({ centuries: 10, intensity: i });
}, 'all 3 intensities');

// Determinism + no proto mutation
{
  const protoBefore = L(99).lexicon.entries.slice(0, 30).map(e => e.lemma).join(',');
  const d1 = L(99).evolve({ centuries: 8 });
  const d2 = Glossopetrae.quick(99).evolve({ centuries: 8 });
  const protoAfter = L(99).lexicon.entries.slice(0, 30).map(e => e.lemma).join(',');
  ok(d1.name === d2.name && JSON.stringify(d1.lexicon.entries.slice(0, 30)) === JSON.stringify(d2.lexicon.entries.slice(0, 30)),
    'evolution deterministic');
  ok(protoBefore === protoAfter, 'proto-language not mutated by evolution');
  ok(d1.lexicon.entries.every(e => e.lemma && e.lemma.length), 'no empty lemmas after evolution');
}

// Chained evolution (evolve a descendant) — stress the fromDescendant path
noThrow(() => {
  let l = L(42);
  let d = l.evolve({ centuries: 6 });
  for (let i = 0; i < 5; i++) {
    const eng = Glossopetrae.quick(42).evolutionEngine.constructor.fromDescendant(d);
    d = eng.evolve({ centuries: 5, seed: 1000 + i });
    if (!d.lexicon.entries.every(e => e.lemma.length)) throw new Error('empty lemma in deep chain');
  }
}, 'deep evolution chain (6 generations) stays valid');

// Family: large + grandchildren, unique names, intact cognate columns
{
  let familyOk = true;
  for (const seed of [1, 2, 42, 777, 9999]) {
    const fam = L(seed).deriveFamily({ daughters: 6, centuries: 10, generations: 2 });
    const names = fam.daughters.map(d => d.name);
    if (new Set(names).size !== names.length) familyOk = false;
    if (fam.cognates.some(r => Object.keys(r.reflexes).length !== 6)) familyOk = false;
  }
  ok(familyOk, '6-daughter families: unique names + intact cognate columns across 5 seeds');
}

// ---------------------------------------------------------------------------
section('5. TRANSLATION round-trip — fuzz across seeds & sentences');

{
  const sentences = [
    'The warrior sees the mountain.',
    'I gave the book to the woman.',
    'Yesterday the children ate bread.',
    'The strong king will rule.',
    'She does not know the truth.',
    'Water is life and fire is death.',
    'Do you see the star?',
    'The old man walks slowly.',
  ];
  let totalRate = 0, n = 0, threw = 0;
  for (const seed of [42, 7, 12345, 777, 31337]) {
    const l = L(seed);
    for (const s of sentences) {
      try {
        const fwd = l.translationEngine.translateToConlang(s);
        const back = l.translateToEnglish(fwd.target);
        if (!back.english || !back.english.length) threw++;
        // crude lexical recall: how many content words survive (lowercased)
        n++;
        const want = s.toLowerCase().replace(/[^a-z ]/g, '').split(/\s+/).filter(w => w.length > 3);
        const got = back.english.toLowerCase();
        const hit = want.filter(w => got.includes(w.replace(/s$/, ''))).length;
        totalRate += want.length ? hit / want.length : 1;
      } catch (e) { threw++; findings.push({ label: `roundtrip seed${seed} "${s.slice(0,20)}"`, detail: e.message }); }
    }
  }
  ok(threw === 0, 'no round-trip threw across 40 sentence×seed combos', `${threw} threw`);
  ok(totalRate / n > 0.6, `mean content-word recall > 60%`, `${(100 * totalRate / n).toFixed(0)}%`);
}

// Reverse-translate hostile / non-conlang input
noThrow(() => {
  for (const h of HOSTILE) L(42).translateToEnglish(h.slice(0, 80));
}, 'reverse translate survives hostile input');

// ---------------------------------------------------------------------------
section('6. EXPORTER — output safety & integrity (XSS in grammar/CSV/JSON)');

{
  const l = L(42);
  // Grammar HTML well-formed + no template leakage
  const html = l.exporter.toGrammarHTML();
  ok(html.includes('<html') && html.includes('</html>'), 'grammar HTML has html tags');
  ok(!/undefined|\[object Object\]|NaN|null<\/td>/.test(html), 'grammar HTML free of undefined/[object Object]/NaN');
  ok(!html.includes('<script'), 'grammar HTML contains no <script> tag');

  // Anki CSV: consistent columns, parseable
  const csv = l.exporter.toAnkiCSV();
  const lines = csv.trim().split('\n').filter(Boolean);
  ok(lines.length > 100, 'Anki CSV has many rows', `${lines.length}`);

  // Dictionary JSON round-trips
  noThrow(() => { const d = JSON.parse(l.exporter.toDictionaryJSON()); if (!d) throw new Error('null'); }, 'dictionary JSON parses');

  // Plain CSV line count == lexicon + header
  const plain = l.exporter.toCSV().trim().split('\n');
  ok(plain.length === l.lexicon.entries.length + 1, 'plain CSV line count = lexicon + header', `${plain.length} vs ${l.lexicon.entries.length + 1}`);

  // Exporters deterministic
  ok(l.exporter.toDictionaryJSON() === Glossopetrae.quick(42).exporter.toDictionaryJSON(), 'dictionary JSON deterministic');
}

// ---------------------------------------------------------------------------
section('7. TEXTLIBRARY / NAMEFORGE — robustness & determinism');

{
  const l = L(42);
  // All 6 texts translate without throwing
  let textOk = true, emptyGloss = 0;
  for (const meta of l.textLibrary.list()) {
    try {
      const t = l.textLibrary.getText(meta.id);
      for (const line of t.lines) if (!line.error && (!line.gloss || !line.conlang)) emptyGloss++;
    } catch (e) { textOk = false; findings.push({ label: `text ${meta.id}`, detail: e.message }); }
  }
  ok(textOk, 'all 6 showcase texts render without throwing');
  ok(emptyGloss === 0, 'no successful text line has empty gloss/conlang', `${emptyGloss} empty`);

  // NameForge determinism + validity
  const batch1 = Glossopetrae.quick(42).nameForge.generate('person', 20, { style: 'compound' });
  const batch2 = Glossopetrae.quick(42).nameForge.generate('person', 20, { style: 'compound' });
  ok(JSON.stringify(batch1) === JSON.stringify(batch2), 'NameForge first batch deterministic for same seed');
  ok(batch1.every(n => n.name && /^[A-ZÀ-Þ]/.test(n.name)), 'all names capitalized & non-empty');
  ok(batch1.every(n => n.meaning && n.meaning.length), 'all names carry a meaning');

  // Place names across all features
  noThrow(() => {
    for (const f of ['any', 'river', 'mountain', 'city', 'forest', 'sea'])
      l.nameForge.placeName({ feature: f });
  }, 'place names for all 6 feature types');
}

// ---------------------------------------------------------------------------
section('8. CROSS-FEATURE integration — evolve→glyph→audio→export the descendant');

noThrow(() => {
  const l = L(42);
  const d = l.evolve({ centuries: 8 });
  // Build a fresh language from the descendant's data isn't directly supported,
  // but we can render the descendant's evolved words through the proto's engines:
  const evolvedWord = d.lexicon.entries[40].lemma;
  l.glyphForge.renderWord(evolvedWord);            // glyph the evolved form
  l.audioForge.synthesizeWord(evolvedWord);        // pronounce the evolved form
  // Reverse-translate a forward translation, then glyph + speak the conlang
  const fwd = l.translationEngine.translateToConlang('The river is cold.');
  l.glyphForge.renderText(fwd.target);
  l.audioForge.synthesizeSentence(fwd.target);
  l.translateToEnglish(fwd.target);
}, 'evolve → glyph → audio → translate pipeline on one language');

// Memory/perf: generate 25 languages and touch every engine
noThrow(() => {
  const t = Date.now();
  for (let i = 0; i < 25; i++) {
    const l = Glossopetrae.quick(1000 + i);
    l.glyphForge.getGlyphTable();
    l.audioForge.synthesizeWord(l.lexicon.entries[0].lemma);
    l.evolve({ centuries: 4 });
    l.nameForge.personName();
    l.translateToEnglish(l.translationEngine.translateToConlang('I see you.').target);
  }
  const dur = Date.now() - t;
  // Generous ceiling: each iteration runs the FULL pipeline + glyphs + audio +
  // evolution + nameforge + a translation round-trip. ~1.3s each is expected.
  if (dur > 60000) throw new Error(`too slow: ${dur}ms for 25 full languages`);
  console.log(`  ⏱  25 languages × all engines: ${dur}ms (${Math.round(dur / 25)}ms each)`);
}, '25 languages × every engine under 60s');

// ---------------------------------------------------------------------------
section(`RESULTS: ${pass} passed, ${fail} failed`);
if (findings.length) {
  console.log('\nFINDINGS:');
  for (const f of findings) console.log(`  • ${f.label}${f.detail ? ': ' + f.detail : ''}`);
}
console.log('');
process.exit(fail > 0 ? 1 : 0);
