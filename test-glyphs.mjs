/**
 * GLOSSOPETRAE GlyphForge Test Script
 * Run with: node test-glyphs.mjs
 *
 * Verifies the procedural glyph generator:
 *  1. Determinism      - same seed => identical glyph tables (deep equal)
 *  2. Distinguishability - no two glyph paths identical within a language
 *  3. Coverage         - every inventory character has a glyph; lexicon
 *                        lemmas render to non-empty SVG
 *  4. Script types     - all 6 types render without throwing
 *  5. Aesthetics       - all 8 aesthetics produce well-formed SVG
 *  6. Directions       - rtl / ttb / boustrophedon differ from ltr
 *
 * Also writes glyph-preview.html (repo root) for visual inspection.
 */

import { writeFileSync } from 'node:fs';
import { Glossopetrae } from './src/Glossopetrae.js';
import { GlyphForge } from './src/modules/GlyphForge.js';

console.log('========================================');
console.log('   GLOSSOPETRAE - GlyphForge Tests');
console.log('========================================\n');

let passed = 0;
let failed = 0;

function check(name, cond, detail = '') {
  if (cond) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`);
  }
}

/** Generate a language without the engine's console noise. */
function genLang(config) {
  const orig = console.log;
  console.log = () => {};
  try {
    return new Glossopetrae(config).generate();
  } finally {
    console.log = orig;
  }
}

function isWellFormedSVG(svg) {
  if (typeof svg !== 'string' || !svg.startsWith('<svg')) return false;
  if (!svg.includes('viewBox')) return false;
  if (svg.includes('NaN') || svg.includes('undefined')) return false;
  // Balanced tags: every <svg|g|path either self-closes or has a closer
  const opens = (svg.match(/<(svg|g|path)[\s>]/g) || []).length;
  const closes = (svg.match(/<\/(svg|g)>/g) || []).length + (svg.match(/\/>/g) || []).length;
  return opens === closes && svg.endsWith('</svg>');
}

function pathCount(svg) {
  return (svg.match(/<path/g) || []).length;
}

// ---------------------------------------------------------------------------
console.log('Test 1: Determinism (same seed => identical glyph tables)');
{
  for (const seed of [123, 9001]) {
    const a = new GlyphForge(genLang({ seed }));
    const b = new GlyphForge(genLang({ seed }));
    const equal = JSON.stringify(a.getGlyphTable()) === JSON.stringify(b.getGlyphTable());
    check(`seed ${seed}: tables deep-equal across two constructions`, equal);
    check(`seed ${seed}: genomes deep-equal`,
      JSON.stringify(a.getStyleGenome()) === JSON.stringify(b.getStyleGenome()));
  }
}

// ---------------------------------------------------------------------------
console.log('\nTest 2: Distinguishability (no two glyph paths identical)');
{
  for (const seed of [1, 42, 77, 1337, 271828]) {
    const forge = new GlyphForge(genLang({ seed }));
    const table = forge.getGlyphTable();
    const paths = table.map(g => g.svgPath);
    const unique = new Set(paths).size === paths.length;
    check(`seed ${seed}: ${paths.length} glyphs, all paths unique`, unique);
  }
}

// ---------------------------------------------------------------------------
console.log('\nTest 3: Coverage (inventory glyphs + lexicon word rendering)');
{
  for (const scriptType of ['alphabet', 'abjad', 'abugida', 'syllabary', 'featural']) {
    const lang = genLang({ seed: 55, scriptType });
    const forge = new GlyphForge(lang);
    const table = forge.getGlyphTable();
    const byIpa = new Map(table.filter(g => g.ipa).map(g => [g.role + ':' + g.ipa, g]));

    let missing = [];
    if (scriptType === 'alphabet' || scriptType === 'featural') {
      for (const c of lang.phonology.consonants) if (!byIpa.has('consonant:' + c.ipa)) missing.push(c.ipa);
      for (const v of lang.phonology.vowels) if (!byIpa.has('vowel:' + v.ipa)) missing.push(v.ipa);
    } else if (scriptType === 'abjad') {
      for (const c of lang.phonology.consonants) if (!byIpa.has('consonant:' + c.ipa)) missing.push(c.ipa);
      for (const v of lang.phonology.vowels) if (!byIpa.has('diacritic:' + v.ipa)) missing.push(v.ipa);
    } else if (scriptType === 'abugida') {
      for (const e of lang.script.characters.inventory) if (!byIpa.has('consonant:' + e.phoneme)) missing.push(e.phoneme);
      for (const m of lang.script.characters.modifiers) if (!byIpa.has('diacritic:' + m.phoneme)) missing.push(m.phoneme);
    } else if (scriptType === 'syllabary') {
      for (const e of lang.script.characters.inventory) if (!byIpa.has('syllable:' + e.phoneme)) missing.push(e.phoneme);
    }
    check(`${scriptType}: full inventory coverage`, missing.length === 0,
      missing.length ? 'missing: ' + missing.slice(0, 5).join(', ') : '');
  }

  // 20 lexicon lemmas render to non-empty SVG containing > 0 <path>
  const lang = genLang({ seed: 55 });
  const forge = new GlyphForge(lang);
  const entries = lang.lexicon.entries;
  const step = Math.max(1, Math.floor(entries.length / 20));
  const lemmas = [];
  for (let i = 0; i < entries.length && lemmas.length < 20; i += step) lemmas.push(entries[i].lemma);
  const bad = lemmas.filter(l => {
    const svg = forge.renderWord(l);
    return !isWellFormedSVG(svg) || pathCount(svg) === 0;
  });
  check(`renderWord on ${lemmas.length} lexicon lemmas => non-empty SVG with paths`,
    bad.length === 0, bad.length ? 'failed lemmas: ' + bad.slice(0, 5).join(', ') : '');
}

// ---------------------------------------------------------------------------
console.log('\nTest 4: All 6 script types render without throwing');
{
  for (const scriptType of ['alphabet', 'abjad', 'abugida', 'syllabary', 'featural', 'logographic']) {
    try {
      const lang = genLang({ seed: 314, scriptType });
      const forge = new GlyphForge(lang);
      const table = forge.getGlyphTable();
      const lemma = lang.lexicon.entries[10].lemma;
      const word = forge.renderWord(lemma);
      const text = forge.renderText(`${lemma} ${lang.lexicon.entries[20].lemma}, ${lang.lexicon.entries[30].lemma}.`, { maxWidth: 480 });
      const glyph = forge.renderGlyphSVG(table[0].key, { size: 64 });
      check(`${scriptType}: table(${table.length}) + word + text + glyph render`,
        table.length > 0 && pathCount(word) > 0 && pathCount(text) > 0 && isWellFormedSVG(glyph));
    } catch (e) {
      check(`${scriptType}: renders`, false, e.message);
    }
  }
}

// ---------------------------------------------------------------------------
console.log('\nTest 5: All 8 aesthetics produce valid SVG');
{
  const aesthetics = ['Angular', 'Curved', 'Geometric', 'Calligraphic', 'Blocky', 'Circular', 'Linear', 'Organic'];
  for (const name of aesthetics) {
    try {
      // NOTE: ScriptGenerator expects the aesthetic details object, not a raw
      // string (string form crashes its summary step upstream of GlyphForge).
      const lang = genLang({ seed: 2024, scriptAesthetic: { name } });
      const forge = new GlyphForge(lang);
      const table = forge.getGlyphTable();
      const allValid = table.every(g => g.svgPath.length > 0 && !g.svgPath.includes('NaN'));
      const text = forge.renderText('ka ti mo su ne', { maxWidth: 400 });
      check(`${name.toLowerCase()}: valid glyphs + well-formed SVG`,
        allValid && isWellFormedSVG(text) && forge.getStyleGenome().aesthetic === name.toLowerCase());
    } catch (e) {
      check(`${name.toLowerCase()}: renders`, false, e.message);
    }
  }
}

// ---------------------------------------------------------------------------
console.log('\nTest 6: Direction handling');
{
  const lang = genLang({ seed: 808 });
  const forge = new GlyphForge(lang);
  const word = lang.lexicon.entries[40].lemma;
  const ltr = forge.renderWord(word, { direction: 'ltr' });
  const rtl = forge.renderWord(word, { direction: 'rtl' });
  const ttb = forge.renderWord(word, { direction: 'ttb' });
  check('rtl output differs from ltr (reversed positions)', rtl !== ltr && isWellFormedSVG(rtl));
  const ttbVB = ttb.match(/viewBox="0 0 (\S+) (\S+)"/);
  check('ttb output is a vertical column (width 100, height > 100)',
    !!ttbVB && Number(ttbVB[1]) === 100 && Number(ttbVB[2]) > 100);

  const sentence = Array.from({ length: 12 }, (_, i) => lang.lexicon.entries[50 + i].lemma).join(' ');
  const bous = forge.renderText(sentence, { direction: 'boustrophedon', maxWidth: 280 });
  check('boustrophedon mirrors odd lines (scale(-1 1) present)',
    isWellFormedSVG(bous) && bous.includes('scale(-1 1)'));
  const ttbRtl = forge.renderText(sentence, { direction: 'ttb-rtl', maxWidth: 280 });
  check('ttb-rtl renders well-formed columns', isWellFormedSVG(ttbRtl));
}

// ---------------------------------------------------------------------------
console.log('\nWriting glyph-preview.html for visual inspection...');
{
  const showcases = [
    { label: 'Alphabet', config: { seed: 1 } },
    { label: 'Syllabary', config: { seed: 7, scriptType: 'syllabary' } },
    { label: 'Abugida', config: { seed: 42 } },
  ];
  let sections = '';
  for (const sc of showcases) {
    const lang = genLang(sc.config);
    const forge = new GlyphForge(lang);
    const g = forge.getStyleGenome();
    const table = forge.getGlyphTable().filter(t => t.role !== 'logogram').slice(0, 80);
    const cards = table.map(t => `
      <div class="card">
        ${forge.renderGlyphSVG(t.key, { size: 56 })}
        <div class="label">${t.roman ?? ''}<span class="role">${t.role}</span></div>
      </div>`).join('');
    const lemmas = Array.from({ length: 6 }, (_, i) => lang.lexicon.entries[i * 7 + 3].lemma);
    const sentence = lemmas.slice(0, 4).join(' ') + ', ' + lemmas.slice(4).join(' ') + '.';
    const sample = forge.renderText(sentence, { size: 40, maxWidth: 860 });
    sections += `
    <section>
      <h2>${lang.name} <small>(seed ${lang.seed})</small></h2>
      <p class="meta">${lang.script.summary || ''} — aesthetic: <b>${g.aesthetic}</b>,
        stroke ${g.strokeWidth}, slant ${g.slant}°, terminals ${g.terminals},
        direction <b>${lang.script.direction.code}</b></p>
      <div class="grid">${cards}</div>
      <h3>Sample: <code>${sentence}</code></h3>
      <div class="sample">${sample}</div>
    </section>`;
  }
  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>GLOSSOPETRAE - GlyphForge Preview</title>
<style>
  body { background: #0e0e12; color: #e8e0cf; font-family: Georgia, serif; margin: 2rem auto; max-width: 960px; }
  h1 { letter-spacing: 0.15em; font-variant: small-caps; }
  h2 small { color: #8a8475; font-size: 0.6em; }
  .meta { color: #a39a85; font-size: 0.9rem; }
  section { border-top: 1px solid #2c2c36; padding-top: 1.5rem; margin-top: 2rem; }
  .grid { display: flex; flex-wrap: wrap; gap: 8px; }
  .card { background: #16161d; border: 1px solid #26262f; border-radius: 8px; padding: 8px;
          display: flex; flex-direction: column; align-items: center; color: #f0e6c8; }
  .label { font-size: 0.75rem; color: #b8ae93; margin-top: 4px; text-align: center; }
  .role { display: block; font-size: 0.6rem; color: #6f6a5c; }
  .sample { background: #16161d; border: 1px solid #26262f; border-radius: 8px; padding: 16px;
            color: #f0e6c8; overflow-x: auto; }
  code { color: #c9b97a; }
</style></head><body>
<h1>GLOSSOPETRAE — GlyphForge Preview</h1>
<p>Three generated languages, their full glyph tables, and a rendered sample sentence.
   Glyphs use <code>currentColor</code> and tint with the page theme.</p>
${sections}
</body></html>`;
  writeFileSync(new URL('./glyph-preview.html', import.meta.url), html);
  console.log('  Wrote glyph-preview.html');
}

// ---------------------------------------------------------------------------
console.log('\n========================================');
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('========================================');
if (failed > 0) process.exitCode = 1;
