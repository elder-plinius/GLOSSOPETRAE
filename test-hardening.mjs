/**
 * GLOSSOPETRAE - Hardening & Edge-Case Regression Test Suite
 *
 * Offline regression guards for:
 *  1. SeededRandom & seedToUint32 edge seeds (0, negative, huge, NaN, Infinity, Unicode)
 *  2. Canonical numeric seed determinism (non-regression)
 *  3. PRESETS & explicit wordOrder forwarding
 *  4. CodeForge & CodeSkin (string seeds, string escapes/spaces/glyphs, unterminated strings, bare return)
 *  5. SteganographyEngine (all 5 EC modes, Unicode payloads, seed=0 determinism, Reed-Solomon correction)
 *  6. AudioForge, GlyphForge, QualityEngine (bounds clamping, SVG/XML/CSV escaping, string seeds)
 *  7. Benchmark & metrics.mjs (negative seeds, McNemar b===c, mutualInfo delimiter safety)
 *  8. Web UI (index.html) & repository hygiene (no NUL bytes, all 78 result files, script integrity)
 */

import fs from 'node:fs';
import path from 'node:path';
import { Glossopetrae, PRESETS, CodeForge, CodeSkin } from './src/Glossopetrae.js';
import { SteganographyEngine } from './src/modules/SteganographyEngine.js';
import { SeededRandom, seedToUint32 } from './src/utils/random.js';
import { buildTasks } from './bench/glossopetrae-bench.mjs';
import { mcnemar, mutualInfo } from './experiments/lib/metrics.mjs';

let pass = 0;
let fail = 0;
const failures = [];

function ok(cond, label, detail = '') {
  if (cond) {
    pass++;
  } else {
    fail++;
    const msg = label + (detail ? ` — ${detail}` : '');
    failures.push(msg);
    console.log(`  ✗ ${msg}`);
  }
}

console.log('========================================');
console.log('  GLOSSOPETRAE HARDENING REGRESSIONS');
console.log('========================================\n');

// ---------------------------------------------------------------------------
// 1. SeededRandom & edge seeds
// ---------------------------------------------------------------------------
console.log('[1] SeededRandom & edge seeds');
{
  const edgeSeeds = [0, -1, -42, 42, Number.MAX_SAFE_INTEGER, 1e25, NaN, Infinity, -Infinity, null, '', '   ', '0', '42', 'hello', '🔥日本語'];
  for (const s of edgeSeeds) {
    const r1 = new SeededRandom(s);
    const r2 = new SeededRandom(s);
    const seq1 = [r1.next(), r1.next(), r1.next(), r1.next(), r1.next()];
    const seq2 = [r2.next(), r2.next(), r2.next(), r2.next(), r2.next()];
    ok(seq1.every((v) => Number.isFinite(v) && v >= 0 && v < 1), `SeededRandom(${JSON.stringify(s)}) produces finite [0,1)`);
    ok(new Set(seq1).size >= 4, `SeededRandom(${JSON.stringify(s)}) does not stall/oscillate`, `unique=${new Set(seq1).size}`);
    ok(JSON.stringify(seq1) === JSON.stringify(seq2), `SeededRandom(${JSON.stringify(s)}) is deterministic`);
  }
  ok(new SeededRandom('0').next() === new SeededRandom(0).next(), 'string "0" matches numeric 0');
  ok(new SeededRandom('42').next() === new SeededRandom(42).next(), 'string "42" matches numeric 42');
  ok(new SeededRandom(NaN).next() !== new SeededRandom(Infinity).next(), 'NaN and Infinity seeds diverge');
  ok(seedToUint32(42) === (42 >>> 0) && seedToUint32(-1) === (-1 >>> 0), 'seedToUint32 preserves numeric >>> 0');
  ok(seedToUint32('alpha') !== seedToUint32('beta'), 'seedToUint32 distinguishes arbitrary strings');
}

// ---------------------------------------------------------------------------
// 2. Canonical seed determinism
// ---------------------------------------------------------------------------
console.log('[2] Canonical numeric seed determinism');
{
  const expected = {
    0: { name: 'Velmoese', wordOrder: 'VOS', trans: 'oitok umeue eshozha' },
    7: { name: 'Vukiese', wordOrder: 'SVO', trans: 'rertrumu cherke obemkhoi' },
    42: { name: 'Ruseiian', wordOrder: 'SVO', trans: 'tsumheich lee tsehangib' },
    1337: { name: 'Nukiese', wordOrder: 'SOV', trans: "juanga'ti baleenang kebru" },
  };
  for (const [seedStr, exp] of Object.entries(expected)) {
    const seed = Number(seedStr);
    const l = Glossopetrae.quick(seed);
    ok(l.name === exp.name, `seed ${seed} name preserved`, `${l.name} vs ${exp.name}`);
    ok(l.morphology.wordOrder.basic === exp.wordOrder, `seed ${seed} wordOrder preserved`, `${l.morphology.wordOrder.basic}`);
    const tr = l.translationEngine.translateToConlang('The warrior sees the mountain.').target;
    ok(tr === exp.trans, `seed ${seed} translation preserved`, `${tr}`);
  }
}

// ---------------------------------------------------------------------------
// 3. PRESETS & explicit wordOrder forwarding
// ---------------------------------------------------------------------------
console.log('[3] PRESETS & explicit wordOrder');
{
  for (const [presetName, preset] of Object.entries(PRESETS)) {
    const l = new Glossopetrae({ ...preset, seed: 42 }).generate();
    ok(l.morphology.wordOrder.basic === preset.wordOrder, `PRESETS.${presetName} honors wordOrder=${preset.wordOrder}`, `got ${l.morphology.wordOrder.basic}`);
  }
  for (const order of ['SOV', 'SVO', 'VSO', 'VOS', 'OVS', 'OSV']) {
    const l = new Glossopetrae({ seed: 42, wordOrder: order }).generate();
    ok(l.morphology.wordOrder.basic === order, `explicit wordOrder=${order} honored`, `got ${l.morphology.wordOrder.basic}`);
  }
  const latin = Glossopetrae.fromDeadLanguage('latin', 'mutated', { seed: 42 });
  ok(latin.morphology.wordOrder.basic === 'SOV', 'fromDeadLanguage(latin) honors SOV', `got ${latin.morphology.wordOrder.basic}`);
}

// ---------------------------------------------------------------------------
// 4. CodeForge & CodeSkin
// ---------------------------------------------------------------------------
console.log('[4] CodeForge & CodeSkin');
{
  const cfA = new CodeForge('alpha');
  const cfB = new CodeForge('beta');
  ok(JSON.stringify(cfA.keywords) !== JSON.stringify(cfB.keywords), 'CodeForge string seeds produce distinct languages');

  const csA = new CodeSkin(cfA, 3, 'alpha');
  const csB = new CodeSkin(cfA, 3, 'beta');
  ok(JSON.stringify([...csA.fwd]) !== JSON.stringify([...csB.fwd]), 'CodeSkin string seeds produce distinct L3 mappings');

  const cf = new CodeForge(42);
  const K = cf.keywords, t = cf.terminator;
  const bo = cf.blockStyle === 'word' ? cf.blockOpen : '{';
  const bc = cf.blockStyle === 'word' ? cf.blockClose : '}';

  const unterm1 = cf.run(`${K.print} "hello${t}`);
  ok(!unterm1.ok && /Unterminated string/i.test(unterm1.error), 'unterminated string fails cleanly', unterm1.error);

  const unterm2 = cf.run(`${K.print} "abc\\`);
  ok(!unterm2.ok && /Unterminated string/i.test(unterm2.error), 'trailing backslash string fails cleanly', unterm2.error);

  const badNum = cf.run(`${K.print} 1.2.3${t}`);
  ok(!badNum.ok && /Invalid number/i.test(badNum.error), 'multi-dot number 1.2.3 rejected', badNum.error);

  const bareRet = cf.run(`${K.func} f() ${bo} ${K.return} ${bc} ${K.print} f()${t}`);
  ok(bareRet.ok && bareRet.output === K.null, 'bare return before blockClose works', bareRet.error || bareRet.output);

  const escStr = cf.run(`${K.print} "a\\nb\\t\\"c\\"\\\\"${t}`);
  ok(escStr.ok && escStr.output === 'a\nb\t"c"\\', 'string escape sequences work', JSON.stringify(escStr.output));

  // CodeSkin round-trip on tricky string literals across L0..L3
  for (const level of [0, 1, 2, 3]) {
    const cs = new CodeSkin(cf, level);
    const glyphPlus = cs.fwd.get('+');
    const glyphPrint = cs.fwd.get(K.print);
    const cases = [
      { src: `${K.print} "hello world"${t}`, expect: 'hello world', name: 'spaces' },
      { src: `${K.print} "hi \\"there\\""${t}`, expect: 'hi "there"', name: 'escaped quotes' },
      { src: `${K.print} "a ${glyphPlus} ${glyphPrint} b"${t}`, expect: `a ${glyphPlus} ${glyphPrint} b`, name: 'embedded glyphs' },
    ];
    for (const c of cases) {
      const skinned = cs.skin(c.src);
      const res = cs.run(skinned);
      ok(res.ok && res.output === c.expect, `CodeSkin L${level} round-trip (${c.name})`, res.error || JSON.stringify(res.output));
    }
  }
}

// ---------------------------------------------------------------------------
// 5. SteganographyEngine
// ---------------------------------------------------------------------------
console.log('[5] SteganographyEngine');
{
  const base = 'The warrior sees the mountain and the river in the dark forest under the cold night sky while the strong king rules the land and the wise teacher speaks to the young child near the great stone and the bird flies above the sea while the sun rises over the tree and fire burns the dry wood.';
  const cover = [base, base, base].join(' ');

  for (const seed of [0, -42, 42, 'phoenix']) {
    const lang = Glossopetrae.quick(seed);
    for (const ec of ['none', 'repeat-3', 'repeat-5', 'hamming', 'reed-solomon']) {
      const se = new SteganographyEngine(lang, { errorCorrection: ec });
      ok(!String(se.honorifics.prefix).includes('undefined'), `stego seed=${seed} honorific defined`);
      ok(!String(se.nullMorphemes.interword).includes('undefined'), `stego seed=${seed} null morpheme defined`);
      const enc = se.encode(cover, 'SECRET-42-🔥');
      const dec = se.decode(enc.stegoWithHeader);
      ok(dec.success && dec.payload === 'SECRET-42-🔥', `stego round-trip seed=${seed} ec=${ec}`, dec.error || String(dec.payload));
    }
  }

  // Determinism for seed 0
  const l0a = Glossopetrae.quick(0);
  const l0b = Glossopetrae.quick(0);
  const enc0a = new SteganographyEngine(l0a, { errorCorrection: 'none' }).encode(base, 'DET0');
  const enc0b = new SteganographyEngine(l0b, { errorCorrection: 'none' }).encode(base, 'DET0');
  ok(enc0a.stegoWithHeader === enc0b.stegoWithHeader, 'SteganographyEngine deterministic on seed=0');

  // Reed-Solomon byte-error correction
  const seRS = new SteganographyEngine(Glossopetrae.quick(42), { errorCorrection: 'reed-solomon' });
  const origBytes = new TextEncoder().encode('Reed-Solomon error correction verification payload!');
  const rsEncoded = seRS.rs.encode(origBytes);
  const corrupted = new Uint8Array(rsEncoded);
  for (let i = 0; i < 12; i++) corrupted[i * 4] ^= 0xA5;
  const rsDecoded = seRS.rs.decode(corrupted);
  ok(rsDecoded.success && rsDecoded.corrected === 12 && new TextDecoder().decode(rsDecoded.data) === 'Reed-Solomon error correction verification payload!',
    'Reed-Solomon corrects 12 byte errors', `success=${rsDecoded.success} corrected=${rsDecoded.corrected}`);

  // Undersized cover throws cleanly (and empty channels do not divide by zero)
  let threwTooSmall = false;
  try {
    new SteganographyEngine(Glossopetrae.quick(42), { channels: [] }).encode('Water is life.', 'HI');
  } catch (e) {
    threwTooSmall = /Payload too large/.test(e.message) && !/Infinity|NaN/.test(e.message);
  }
  ok(threwTooSmall, 'empty channels throw clean capacity error without Infinity/NaN');
}

// ---------------------------------------------------------------------------
// 6. AudioForge, GlyphForge, QualityEngine
// ---------------------------------------------------------------------------
console.log('[6] AudioForge, GlyphForge, QualityEngine');
{
  const lang = Glossopetrae.quick(42);
  const af = lang.audioForge;

  for (const [label, fn] of [
    ['rate=0', () => af.synthesizeWord('ata', { rate: 0 })],
    ['rate=-1', () => af.synthesizeWord('ata', { rate: -1 })],
    ['f0=0', () => af.synthesizeWord('ata', { f0: 0 })],
    ['pause=-5', () => af.synthesizeSentence('ata bata', { pause: -5 })],
  ]) {
    let valid = false;
    try {
      const res = fn();
      valid = res.samples.length > 0 && !res.samples.some((v) => !Number.isFinite(v));
    } catch {
      valid = false;
    }
    ok(valid, `AudioForge handles ${label} safely without crash or NaN`);
  }

  const afA = Glossopetrae.quick('alpha').audioForge.synthesizeWord('ata').samples;
  const afB = Glossopetrae.quick('beta').audioForge.synthesizeWord('ata').samples;
  ok(afA.length !== afB.length || afA.some((v, i) => v !== afB[i]), 'AudioForge distinguishes string seeds');

  const gf = lang.glyphForge;
  const svgXss = gf.renderWord('ata', { color: '" onload="alert(1)' });
  ok(!svgXss.includes('onload="alert(1)'), 'GlyphForge escapes SVG color attribute');
  const svgZero = gf.renderText('ata', { size: 0 });
  const svgNeg = gf.renderText('ata', { size: -10 });
  ok(!svgZero.includes('NaN') && !svgZero.includes('Infinity') && !svgNeg.includes('width="-'), 'GlyphForge clamps non-positive sizes');

  const gfA = Glossopetrae.quick('alpha').glyphForge.renderWord('ata');
  const gfB = Glossopetrae.quick('beta').glyphForge.renderWord('ata');
  ok(gfA !== gfB, 'GlyphForge distinguishes string seeds');

  const hostileLang = new Glossopetrae({ seed: 42, name: 'Test<"&\'>Lang' }).generate();
  const xml = hostileLang.qualityEngine._exportConlangML();
  ok(!xml.includes('name="Test<"'), 'QualityEngine ConlangML escapes XML attributes');
  hostileLang.lexicon.entries[0].gloss = 'say "hello" & wave';
  const csv = hostileLang.qualityEngine._exportCSV();
  ok(csv.includes('"say ""hello"" & wave"'), 'QualityEngine CSV escapes embedded double quotes');
}

// ---------------------------------------------------------------------------
// 7. Benchmark & Metrics
// ---------------------------------------------------------------------------
console.log('[7] Benchmark & metrics');
{
  const negTasks = buildTasks([-1, -42]);
  ok(negTasks.length === 14, 'buildTasks handles negative seeds', `got ${negTasks.length}`);
  ok(negTasks.every((t) => typeof t.prompt === 'string' && !t.prompt.includes('undefined') && t.grade(t.solution).pass),
    'negative-seed benchmark tasks have valid prompts and passing oracles');

  const equalMc = mcnemar([
    ...Array.from({ length: 10 }, () => ({ receiverCorrect: true, monitorCorrect: false })),
    ...Array.from({ length: 10 }, () => ({ receiverCorrect: false, monitorCorrect: true })),
  ]);
  ok(equalMc.chi2 === 0 && equalMc.pValue === 1 && !equalMc.significant,
    'mcnemar(b===c) returns chi2=0 and pValue=1', JSON.stringify(equalMc));

  const miDelim = mutualInfo(['a|||b', 'c|||d', 'a|||b', 'c|||d'], ['x|||y', 'z|||w', 'x|||y', 'z|||w']);
  ok(Number.isFinite(miDelim) && Math.abs(miDelim - 1) < 1e-6, 'mutualInfo handles "|||" delimiter inside values', String(miDelim));
}

// ---------------------------------------------------------------------------
// 8. Web UI & Repository Hygiene
// ---------------------------------------------------------------------------
console.log('[8] Web UI (index.html) & repository hygiene');
{
  // Zero literal NUL bytes across source files
  const nulFiles = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === '.git' || e.name === 'node_modules') continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(js|mjs|html|md|json|yaml|yml|css)$/.test(e.name)) {
        if (fs.readFileSync(p).indexOf(0) !== -1) nulFiles.push(p);
      }
    }
  };
  walk('.');
  ok(nulFiles.length === 0, 'zero raw NUL bytes in repository text files', nulFiles.join(', '));

  const html = fs.readFileSync('index.html', 'utf8');
  ok(!html.includes('translationEngine.translate('), 'index.html does not call nonexistent translationEngine.translate()');
  ok(!html.includes('phon?.phonotactics?.syllableStructure'), 'index.html uses lang.phonotactics.template.formula');
  ok(!html.includes('lang.phonology?.inventory?.consonants'), 'index.html uses lang.phonology.consonants');

  const m = html.match(/const R_RESULT_FILES = \[([\s\S]*?)\];/);
  const listed = m ? [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]) : [];
  const actual = fs.readdirSync('experiments/results').filter((f) => f.endsWith('.json'));
  const missing = listed.filter((f) => !actual.includes(f));
  const unlisted = actual.filter((f) => !listed.includes(f));
  ok(missing.length === 0 && unlisted.length === 0 && listed.length === actual.length,
    `index.html R_RESULT_FILES lists all ${actual.length} experiment result JSONs`,
    `listed=${listed.length} actual=${actual.length} missing=${missing.length} unlisted=${unlisted.length}`);
}

console.log('\n========================================');
console.log(`  ${pass} passed, ${fail} failed`);
if (failures.length) {
  console.log('  FAILURES:\n   - ' + failures.join('\n   - '));
}
console.log('========================================');
process.exit(fail > 0 ? 1 : 0);
